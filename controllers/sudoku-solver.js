/**
 * @file controllers/sudoku-solver.js
 *
 * Contains a class with functions that validate and solve sudoku puzzles.
 */

/**
 * @typedef ValidateResult
 * @brief The return value of the @a SudokuSolver.validate method.
 * @type {object}
 * @property {boolean} ok True if the result is successful, false otherwise.
 * @property {string} error Contains the error which occured, if one has occured.
 */

/**
 * @typedef CheckResult
 * @brief The return value of the @a SudokuSolver's place-checking methods.
 * @type {object}
 * @property {boolean} valid True if the placement is valid, false otherwise.
 * @property {string} error Contains an error if one has occured.
 */

/**
 * @typedef CheckSolvedResult
 * @brief The return value of the @a SudokuSolver's 'checkSolve' method.
 * @type {object}
 * @property {boolean} solved True if the puzzle string is valid and solved.
 * @property {string} error Contains an error if one has occured.
 * @property {string[]} conflict Contains any conflicts that have been found.
 */

/**
 * Generates a random number between the given lower- and upper-bound range,
 * both inclusive.
 *
 * @param {number} min The lower-bound value.
 * @param {number} max The upper-bound value.
 * @returns The randomly-generated number
 */
const getRandomValue = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1) + min);
};

/**
 * Converts the given row letter and column number into a base-zero X and Y coordinate,
 * and retrieves the cell, as well.
 *
 * @param {string} rowLetter A letter, between A and I, representing the row.
 * @param {number} colNumber A number, between 1 and 9, representing the column.
 * @return {number[]|boolean} The converted X and Y coordinate and cell number, or false if the row letter or
 * column number is invalid.
 */
const toBaseZeroCoordinate = (rowLetter, colNumber) => {
  const capiatalACode = "A".charCodeAt();
  const rowCoord = rowLetter.charCodeAt() - capiatalACode;
  const colCoord = colNumber - 1;

  if (rowCoord < 0 || rowCoord > 8 || colCoord < 0 || colCoord > 8) {
    return false;
  }

  return [colCoord, rowCoord, 9 * rowCoord + colCoord];
};

/**
 * Converts the given cell index number into a letter-and-number notation
 * coordinate.
 *
 * @param {number} cellNumber The index of the cell in the puzzle string.
 * @returns {[string, number]} The letter-and-number notation coordinate.
 */
const toLetterNumberCoordinate = (cellNumber) => {
  const rowLetters = "ABCDEFGHI";

  // return `${rowLetters[Math.floor(cellNumber / 9)]}${(cellNumber % 9) + 1}`;
  return [rowLetters[Math.floor(cellNumber / 9)], (cellNumber % 9) + 1];
};

/**
 * A class containing functions used for validating, place-checking and solving
 * sudoku puzzles.
 */
class SudokuSolver {
  /**
   * Generates a random Sudoku puzzle string.
   * @returns {string} The generated puzzle string.
   */
  generate() {
    // An array containing our puzzle.
    let puzzle = [];

    // An array of the indices which should be hidden.
    let hidden = [];

    // Iterate over each cell of the board.
    let cursor = 0;
    while (cursor < 81) {
      // Get the letter-and-number notation of the cursor.
      const [row, col] = toLetterNumberCoordinate(cursor);

      // Keep a flag to indicate whether this sudoku is solvable.
      let solvable = true;

      // Keep an array of single-digits to randomly draw from, if we should
      // fill this cell.
      const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9];

      // Draw a random number between 1 and 1000. If the number is above 500,
      // then we should fill this cell. Otherwise, leave it alone.
      while (true) {
        // Randomly draw a valid index within the 'digits' array in its current
        // state.
        const randomIndex = getRandomValue(0, digits.length - 1);
        const digit = digits[randomIndex];

        // Fill this current cell with this value if it can be placed here.
        const canBePlaced =
          this.checkPlacement(puzzle.join(""), row, col, digit).valid === true;
        if (canBePlaced) {
          puzzle.push(digit);

          // Randomly decide whether this cell should be hidden.
          const shouldBeHidden = getRandomValue(1, 1000) >= 500;
          if (shouldBeHidden) {
            hidden.push(cursor);
          }

          break;
        } else {
          // Otherwise, splice the selected digit out of the digits array and
          // try another digit.
          digits.splice(randomIndex, 1);

          // If, as a result, there are no more digits to try, then the puzzle
          // being generated is unsolvable.
          if (digits.length === 0) {
            solvable = false;
            break;
          }
        }
      }

      // If the sudoku at any point becomes un-solvable, clear the board,
      // re-set the cursor to zero and start generating over.
      if (solvable === false) {
        puzzle = [];
        hidden = [];
        cursor = 0;
      } else {
        cursor++;
      }
    }

    for (let i = 0; i < hidden.length; ++i) {
      puzzle[hidden[i]] = ".";
    }

    return puzzle.join("");
  }

  /**
   * Checks to see if a completely-filled-in puzzle string represents a successfully-solved
   * Sudoku puzzle.
   *
   * @param {string} puzzle The solved puzzle string to check.
   * @return {CheckSolvedResult} The result of the check.
   */
  checkSolve(puzzle) {
    // Validate the puzzle string before checking the solve.
    const validation = this.validate(puzzle);
    if (validation.ok === false) {
      return { solved: false, error: validation.error };
    }

    for (let i = 0; i < puzzle.length; ++i) {
      // If this cell is blank, then the puzzle is not solved.
      if (puzzle[i] === ".") {
        return { solved: false, error: "Puzzle is not solved" };
      }

      // Get the letter-and-number notation of this cell.
      const [row, col] = toLetterNumberCoordinate(i);

      // Check the validity of this cell's rol, column and region placement.
      const cr = this.checkRowPlacement(puzzle, row, col, +puzzle[i]);
      const cc = this.checkColPlacement(puzzle, row, col, +puzzle[i]);
      const cg = this.checkRegionPlacement(puzzle, row, col, +puzzle[i]);

      // Check for conflicts.
      const conflicts = [];
      if (cr.valid === false) {
        conflicts.push("row");
      }
      if (cc.valid === false) {
        conflicts.push("column");
      }
      if (cg.valid === false) {
        conflicts.push("region");
      }

      if (conflicts.length > 0) {
        return {
          solved: false,
          error: `Cell '${row}${col}' contains conflicts.`,
          conflict: conflicts,
        };
      }
    }

    return { solved: true };
  }

  /**
   * Checks to see if the given puzzle string contains exactly 81 valid characters.
   * Valid characters include the numbers 0 - 9, and the period (.).
   * @param {string} puzzleString The puzzle string to validate
   * @return {ValidateResult} The result of the validation.
   */
  validate(puzzleString) {
    const validPuzzleRegex = /^[\.\d]{81}$/;

    // Check to see if a puzzle was provided at all.
    if (!puzzleString) {
      return { ok: false, error: "No puzzle string given." };
    }

    // Puzzles not 81 characters in length are invalid.
    if (puzzleString.length !== 81) {
      return { ok: false, error: "Expected puzzle to be 81 characters long" };
    }

    // Puzzle strings which do not pass the above regex are invalid.
    if (validPuzzleRegex.test(puzzleString) === false) {
      return { ok: false, error: "Invalid characters in puzzle" };
    }

    // This is a valid puzzle string.
    return { ok: true };
  }

  /**
   * Checks to see if placing the given value into the cell at the given row and column
   * renders a .
   *
   * @param {string} puzzleString The puzzle string or array to check.
   * @param {string} row A letter, between A and I, indicating the row.
   * @param {number} column A number, between 1 and 9, indicating the column.
   * @param {number} value A number, between 1 and 9, to be placed at the given position.
   *
   * @return {CheckResult} The result of placing the given value into the given cell.
   */
  checkRowPlacement(puzzleString, row, column, value) {
    // Get the X and Y coordinate of the given row and column.
    const coord = toBaseZeroCoordinate(row, column);

    // Find the start point of this row and slice this string from that point
    // to the end of the row.
    const rowStart = 9 * coord[1];
    let rowString = puzzleString.slice(rowStart, rowStart + 9);

    // If the value given is already present at the given row and column, then
    // omit that value from the row string.
    if (puzzleString[coord[2]] === `${value}`) {
      const valueIndex = rowString.indexOf(`${value}`);
      rowString = `${rowString.slice(0, valueIndex)}${rowString.slice(
        valueIndex + 1
      )}`;
    }

    // Return valid if the given value is not present in this row string.
    return { valid: rowString.includes(`${value}`) === false };
  }

  checkColPlacement(puzzleString, row, column, value) {
    // Get the X and Y coordinate of the given row and column.
    const coord = toBaseZeroCoordinate(row, column);

    // Find the start point of this column. Create an array of the values in that
    // column.
    const colStart = coord[0];
    const colArray = [];
    for (let i = 0; i < 9; ++i) {
      // If the current cell in the column being iterated over is the cell reflected
      // by the given coordinates, and that cell is the given value, then omit that
      // cell from the array.
      if (
        coord[2] === colStart + i * 9 &&
        puzzleString[coord[2]] === `${value}`
      ) {
        continue;
      }

      colArray.push(puzzleString[colStart + i * 9]);
    }

    // Return valid if the given value is not present in the above array.
    return { valid: colArray.includes(`${value}`) === false };
  }

  checkRegionPlacement(puzzleString, row, column, value) {
    // Get the X and Y coordinate of the given row and column.
    const coord = toBaseZeroCoordinate(row, column);
    const [x, y, cell] = coord;

    // Get the top-left-most portion of the region the above coordinates
    // fall into.
    const regionTopLeft = [Math.floor(x / 3) * 3, Math.floor(y / 3) * 3];

    // Create an array and fill it with the elements in this 3x3 region.
    const regionArray = [];
    for (let i = 0; i < 3; ++i) {
      for (let j = 0; j < 3; ++j) {
        // If the current region cell is the cell returned by the coordinate function
        // above, and that cell contains the given value, then omit that value
        // from the region array.
        const regionCell = 9 * (regionTopLeft[1] + i) + (regionTopLeft[0] + j);
        if (cell === regionCell && puzzleString[regionCell] === `${value}`) {
          continue;
        }

        regionArray.push(puzzleString[regionCell]);
      }
    }

    // Return valid if the given value is not present in the above array.
    return { valid: regionArray.includes(`${value}`) === false };
  }

  checkPlacement(puzzleString, row, column, value) {
    return {
      valid:
        this.checkRowPlacement(puzzleString, row, column, value).valid ===
          true &&
        this.checkColPlacement(puzzleString, row, column, value).valid ===
          true &&
        this.checkRegionPlacement(puzzleString, row, column, value).valid ===
          true,
    };
  }

  getNextEmptyCell(puzzleString) {
    for (let i = 0; i < puzzleString.length; ++i) {
      if (puzzleString[i] === ".") {
        const [row, col] = toLetterNumberCoordinate(i);
        const possibleValues = [];

        for (let v = 1; v <= 9; ++v) {
          if (this.checkPlacement(puzzleString, row, col, v).valid) {
            possibleValues.push(`${v}`);
          }
        }

        return { row, col, index: i, possible: possibleValues };
      }
    }

    return false;
  }

  /**
   *
   * @param {string} puzzleString
   * @returns
   */
  solve(puzzleString, validateFirst = true) {
    // This function is run recursively. Validate the puzzle string only on
    // the first iteration.
    if (validateFirst === true) {
      // Validate the puzzle string before attempting to solve.
      const validation = this.validate(puzzleString);
      if (validation.ok === false) {
        return { error: validation.error };
      }
    }

    // If the puzzle string received is a string, then convert it into an
    // array so we can modify it in place.
    if (typeof puzzleString === "string") {
      puzzleString = [...puzzleString];
    } else if (Array.isArray(puzzleString) === false) {
      return { error: "puzzleString must be a string or a string array" };
    }

    // Get the row letter, column number and index of the next empty cell in
    // the puzzle string. If the below function returns false, then the puzzle
    // is full.
    const nextEmptyCell = this.getNextEmptyCell(puzzleString);
    if (nextEmptyCell === false) {
      return { solution: puzzleString.join("") };
    }

    // Get the row, column, index and possible values for this cell.
    const { row, col, index, possible } = nextEmptyCell;

    // If this empty cell has only one possible value to it, then emplace that
    // value into the solving array and continue into the next iteration.
    if (possible.length === 1) {
      puzzleString[index] = possible[0];
      this.solve(puzzleString, false);
    } else {
      // Iterate through all of the possible values for this cell.
      for (const value of possible) {
        if (this.checkPlacement(puzzleString, row, col, value).valid === true) {
          puzzleString[index] = value;
          this.solve(puzzleString, false);
        }
      }
    }

    const next = this.getNextEmptyCell(puzzleString);
    if (next !== false) {
      puzzleString[index] = ".";
    }

    if (puzzleString.includes(".")) {
      return { error: "Puzzle cannot be solved" };
    } else {
      return { solution: puzzleString.join("") };
    }
  }
}

module.exports = SudokuSolver;
