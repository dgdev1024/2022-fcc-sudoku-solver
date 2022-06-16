const chai = require("chai");
const assert = chai.assert;

const { puzzlesAndSolutions } = require("../controllers/puzzle-strings");
const Solver = require("../controllers/sudoku-solver.js");
const solver = new Solver();

suite("UnitTests", () => {
  suite("Puzzle String Validation", () => {
    test("Handles a valid puzzle string of 81 characters.", () => {
      const puzzle = puzzlesAndSolutions[0][0];
      const isValid = solver.validate(puzzle);

      assert.property(isValid, "ok");
      assert.strictEqual(isValid.ok, true);
    });

    test("Handles a puzzle string with invalid characters (not 1-9 or '.').", () => {
      const puzzle = ".".repeat(81).split("");
      puzzle[4] = "D";
      puzzle[5] = "e";
      puzzle[6] = "n";
      puzzle[7] = "n";
      puzzle[8] = "i";
      puzzle[9] = "s";

      const isValid = solver.validate(puzzle.join(""));

      assert.property(isValid, "ok");
      assert.strictEqual(isValid.ok, false);

      assert.property(isValid, "error");
      assert.strictEqual(isValid.error, "Invalid characters in puzzle");
    });

    test("Handles a puzzle string that is not 81 characters in length.", () => {
      const puzzle = ".".repeat(80);
      const isValid = solver.validate(puzzle);

      assert.property(isValid, "ok");
      assert.strictEqual(isValid.ok, false);

      assert.property(isValid, "error");
      assert.strictEqual(
        isValid.error,
        "Expected puzzle to be 81 characters long"
      );
    });
  });

  suite("Value Placement", () => {
    let testPuzzle = puzzlesAndSolutions[0][0];

    test("Handles a valid row placement.", () => {
      const checkRow = solver.checkRowPlacement(testPuzzle, "A", 2, 3);
      assert.property(checkRow, "valid");
      assert.strictEqual(checkRow.valid, true);
    });

    test("Handles an invalid row placement.", () => {
      const checkRow = solver.checkRowPlacement(testPuzzle, "A", 2, 1);
      assert.property(checkRow, "valid");
      assert.strictEqual(checkRow.valid, false);
    });

    test("Handles a valid column placement.", () => {
      const checkCol = solver.checkColPlacement(testPuzzle, "B", 1, 9);
      assert.property(checkCol, "valid");
      assert.strictEqual(checkCol.valid, true);
    });

    test("Handles an invalid column placement.", () => {
      const checkCol = solver.checkColPlacement(testPuzzle, "B", 1, 1);
      assert.property(checkCol, "valid");
      assert.strictEqual(checkCol.valid, false);
    });

    test("Handles a valid region (3x3 grid) placement.", () => {
      const checkRegion = solver.checkRegionPlacement(testPuzzle, "C", 6, 9);
      assert.property(checkRegion, "valid");
      assert.strictEqual(checkRegion.valid, true);
    });

    test("Handles an invalid region (3x3 grid) placement.", () => {
      const checkRegion = solver.checkRegionPlacement(testPuzzle, "C", 6, 5);
      assert.property(checkRegion, "valid");
      assert.strictEqual(checkRegion.valid, false);
    });
  });

  suite("Puzzle Solving", () => {
    test("Valid puzzle strings pass the solver.", () => {
      const puzzle =
        "..9..5.1.85.4....2432......1...69.83.9.....6.62.71...9......1945....4.37.4.3..6..";
      const solve = solver.solve(puzzle);

      assert.notProperty(solve, "error");
      assert.property(solve, "solution");
      assert.strictEqual(
        solve.solution,
        "769235418851496372432178956174569283395842761628713549283657194516924837947381625"
      );

      const check = solver.checkSolve(solve.solution);
      assert.notProperty(check, "error");
      assert.notProperty(check, "conflict");
    });

    test("Invalid puzzle strings fail the solver.", () => {
      const puzzleOne = ".".repeat(80);
      let solve = solver.solve(puzzleOne);

      assert.property(solve, "error");
      assert.strictEqual(
        solve.error,
        "Expected puzzle to be 81 characters long"
      );

      const puzzleTwo = ".".repeat(81).split("");
      puzzleTwo[4] = "D";
      puzzleTwo[5] = "e";
      puzzleTwo[6] = "n";
      puzzleTwo[7] = "n";
      puzzleTwo[8] = "i";
      puzzleTwo[9] = "s";

      solve = solver.solve(puzzleTwo.join(""));
      assert.property(solve, "error");
      assert.strictEqual(solve.error, "Invalid characters in puzzle");

      const puzzleThree = puzzlesAndSolutions[0][0].split("");
      puzzleThree[0] = "1";
      puzzleThree[1] = "1";

      solve = solver.solve(puzzleThree.join(""));
      assert.property(solve, "error");
      assert.strictEqual(solve.error, "Puzzle cannot be solved");
    });

    test("Solver returns the expected solution for an incomplete puzzle.", () => {
      for (const puzzle of puzzlesAndSolutions) {
        const [unsolved, solved] = puzzle;

        const solve = solver.solve(unsolved);

        assert.notProperty(solve, "error");
        assert.property(solve, "solution");
        assert.strictEqual(solve.solution, solved);

        const check = solver.checkSolve(solve.solution);

        assert.notProperty(check, "error");
        assert.notProperty(check, "conflict");
      }
    });

    test("Solver can generate random Sudokus that can be solved.", () => {
      const generated = solver.generate();
      const solve = solver.solve(generated);

      assert.notProperty(solve, "error");
      assert.property(solve, "solution");

      const check = solver.checkSolve(solve.solution);

      assert.notProperty(check, "error");
      assert.notProperty(check, "conflict");
    });
  });
});
