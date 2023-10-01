import Cell from "./Cell"
import SheetMemory from "./SheetMemory"
import { ErrorMessages } from "./GlobalDefinitions";



export class FormulaEvaluator {
  // Define a function called update that takes a string parameter and returns a number
  private _errorOccured: boolean = false;
  private _errorMessage: string = "";
  private _currentFormula: FormulaType = [];
  private _lastResult: number = 0;
  private _sheetMemory: SheetMemory;
  private _result: number = 0;
  private _currentIndex: number = 0;

  private expression(): number {
    let result = this.term();
    if (this._errorOccured) {
      return this._lastResult;
    }
    while (
      this._currentIndex < this._currentFormula.length &&
      (this._currentFormula[this._currentIndex] === "+" ||
        this._currentFormula[this._currentIndex] === "-")
    ) {
      const operator = this._currentFormula[this._currentIndex];
      this._currentIndex++;
      const termValue = this.term();
      if (this._errorOccured) {
        return this._lastResult;
      }
      if (termValue === null) {
        this._errorOccured = true;
        this._errorMessage = ErrorMessages.invalidFormula;
        return this._lastResult;
      }

      if (operator === "+") {
        result += termValue;
        this._lastResult = result;
      } else if (operator === "-") {
        result -= termValue;
        this._lastResult = result;
      }
    }
    this._lastResult = result;
    return result;
  }

  private term(): number {
    let result = this.factor();
    if (this._errorOccured) {
      return this._lastResult;
    }
    while (
      this._currentIndex < this._currentFormula.length &&
      (this._currentFormula[this._currentIndex] === "*" ||
        this._currentFormula[this._currentIndex] === "/")
    ) {
      const operator = this._currentFormula[this._currentIndex];
      this._currentIndex++;
      const factorValue = this.factor();
      if (this._errorOccured) {
        return this._lastResult;
      }
      if (operator === "*") {
        result *= factorValue;
      } else if (operator === "/") {
        if (factorValue === 0) { 
          this._errorOccured = true;
          this._errorMessage = ErrorMessages.divideByZero;
          this._lastResult = Infinity;
          return Infinity;
        }
        result /= factorValue;
      }
    }
    this._lastResult = result;
    return result;
}


  private factor(): number {
    const token = this._currentFormula[this._currentIndex];
    this._currentIndex++;

    if (token === "(") {
      const result = this.expression();
      if (this._errorOccured) {
        return this._lastResult;
      }
      if (this._currentFormula[this._currentIndex] !== ")") {
        this._errorOccured = true;
        this._errorMessage = ErrorMessages.missingParentheses;
        return this._lastResult;
      }
      this._currentIndex++;
      this._lastResult = result;
      return result;
    }

    if (token === ")" || token === undefined) {
      this._errorOccured = true;
      this._errorMessage = ErrorMessages.invalidFormula;
      return this._lastResult;
    }

    if (!this.isNumber(token)) {
      if (this.isCellReference(token)) {
        const [value, error] = this.getCellValue(token);
        if (error) {
          this._errorOccured = true;
          this._errorMessage = error;
          return this._lastResult;
        }
        this._lastResult = value;
        return value;
      } else {
        this._errorOccured = true;
        this._errorMessage = ErrorMessages.invalidNumber;
        return this._lastResult;
      }
    }

    this._lastResult = parseInt(token);
    return parseInt(token);
  }
  
  constructor(memory: SheetMemory) {
    this._sheetMemory = memory;
  }

  /**
    * place holder for the evaluator.   I am not sure what the type of the formula is yet 
    * I do know that there will be a list of tokens so i will return the length of the array
    * 
    * I also need to test the error display in the front end so i will set the error message to
    * the error messages found In GlobalDefinitions.ts
    * 
    * according to this formula.
    * 
    7 tokens partial: "#ERR",
    8 tokens divideByZero: "#DIV/0!",
    9 tokens invalidCell: "#REF!",
  10 tokens invalidFormula: "#ERR",
  11 tokens invalidNumber: "#ERR",
  12 tokens invalidOperator: "#ERR",
  13 missingParentheses: "#ERR",
  0 tokens emptyFormula: "#EMPTY!",

                    When i get back from my quest to save the world from the evil thing i will fix.
                      (if you are in a hurry you can fix it yourself)
                               Sincerely 
                               Bilbo
    * 
   */



  evaluate(formula: FormulaType) {


    this._currentIndex = 0;
    this._errorMessage = "";
    this._currentFormula = [...formula];
    this._errorOccured = false;



    if (formula.length === 0) { 
      this._errorMessage = ErrorMessages.emptyFormula;
      this._result = 0;
    }



    let resultValue = this.expression();
    this._result = resultValue;

    if (formula.length === 2 && formula[1] === "(" ) {
      this._errorOccured = true;
      this._errorMessage = ErrorMessages.missingParentheses;
    }

    if (this._errorOccured) {
      this._result = this._lastResult;;
    }   
  }

  public get error(): string {
    return this._errorMessage
  }

  public get result(): number {
    return this._result;
  }




  /**
   * 
   * @param token 
   * @returns true if the toke can be parsed to a number
   */
  isNumber(token: TokenType): boolean {
    return !isNaN(Number(token));
  }

  /**
   * 
   * @param token
   * @returns true if the token is a cell reference
   * 
   */
  isCellReference(token: TokenType): boolean {

    return Cell.isValidCellLabel(token);
  }

  /**
   * 
   * @param token
   * @returns [value, ""] if the cell formula is not empty and has no error
   * @returns [0, error] if the cell has an error
   * @returns [0, ErrorMessages.invalidCell] if the cell formula is empty
   * 
   */
  getCellValue(token: TokenType): [number, string] {

    let cell = this._sheetMemory.getCellByLabel(token);
    let formula = cell.getFormula();
    let error = cell.getError();

    // if the cell has an error return 0
    if (error !== "" && error !== ErrorMessages.emptyFormula) {
      return [0, error];
    }

    // if the cell formula is empty return 0
    if (formula.length === 0) {
      return [0, ErrorMessages.invalidCell];
    }


    let value = cell.getValue();
    return [value, ""];

  }


}

export default FormulaEvaluator;