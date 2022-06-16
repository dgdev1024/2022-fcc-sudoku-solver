"use strict";

const SudokuSolver = require("../controllers/sudoku-solver.js");

module.exports = function (app) {
  let solver = new SudokuSolver();

  app.route("/api/check").post((req, res) => {
    // Pull the puzzle string, a coordinate, and the value to check from
    // the request body.
    let { puzzle, coordinate, value } = req.body;

    // Make sure all of the above are present in the request body.
    if (!puzzle || !coordinate || !value) {
      return res.json({ error: "Required field(s) missing" });
    }

    // Make sure the data is of the proper type.
    if (typeof puzzle !== "string") {
      return res.json({ error: "Puzzle must be a string" });
    }

    if (typeof coordinate !== "string") {
      return res.json({ error: "Coordinate must be a string" });
    }

    // Make sure the value given is a number between 1 and 9.
    value = parseInt(value);
    if (isNaN(value) === true || value < 0 || value > 9) {
      return res.json({ error: "Invalid value" });
    }

    // Make sure the puzzle string given is valid.
    const validation = solver.validate(puzzle);
    if (validation.ok === false) {
      return res.json({ error: validation.error });
    }

    // Make sure the coordinate contains a letter A-I, followed by a number 1-9.
    if (/^[A-I][1-9]$/.test(coordinate) === false) {
      return res.json({ error: "Invalid coordinate" });
    }

    // Pull the row letter and the column number from the coordinate.
    const rowLetter = coordinate[0];
    const columnNumber = +coordinate[1];

    // Validate the row, column and region placement of the given value.
    const rowCheck = solver.checkRowPlacement(
      puzzle,
      rowLetter,
      columnNumber,
      value
    );

    const columnCheck = solver.checkColPlacement(
      puzzle,
      rowLetter,
      columnNumber,
      value
    );

    const regionCheck = solver.checkRegionPlacement(
      puzzle,
      rowLetter,
      columnNumber,
      value
    );

    // Create an array and populate it with any conflicts that occured in the checks above.
    const conflicts = [];
    if (rowCheck.valid === false) {
      conflicts.push("row");
    }
    if (columnCheck.valid === false) {
      conflicts.push("column");
    }
    if (regionCheck.valid === false) {
      conflicts.push("region");
    }

    // Create the response.
    const response = { valid: conflicts.length === 0 };
    if (response.valid === false) {
      response.conflict = conflicts;
    }

    // Return the response.
    return res.json(response);
  });

  app.route("/api/solve").post((req, res) => {
    // Pull the puzzle string from the request body.
    const { puzzle } = req.body;

    // Make sure a puzzle was provided.
    if (!puzzle) {
      return res.json({ error: "Required field missing" });
    }

    // Attempt to solve the puzzle. Calling 'solve' will validate the puzzle string, first.
    const solve = solver.solve(puzzle);
    if (solve.error) {
      return res.json(solve);
    }

    return res.json(solve);
  });
};
