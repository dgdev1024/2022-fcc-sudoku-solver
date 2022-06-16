const chai = require("chai");
const chaiHttp = require("chai-http");
const assert = chai.assert;
const server = require("../server");
const { puzzlesAndSolutions } = require("../controllers/puzzle-strings");

chai.use(chaiHttp);

suite("Functional Tests", () => {
  suite("POST /api/solve", () => {
    test("Solve a puzzle with a valid puzzle string", () => {
      const [puzzle, solution] = puzzlesAndSolutions[0];

      chai
        .request(server)
        .post("/api/solve")
        .send({ puzzle })
        .end((err, res) => {
          assert.strictEqual(res.status, 200);
          assert.strictEqual(res.type, "application/json");

          assert.notProperty(res.body, "error");
          assert.property(res.body, "solution");
          assert.strictEqual(res.body.solution, solution);
        });
    });

    test("Solve a puzzle with a missing puzzle string", () => {
      chai
        .request(server)
        .post("/api/solve")
        .send({ puzzle: undefined })
        .end((err, res) => {
          assert.notProperty(res.body, "solution");
          assert.property(res.body, "error");
          assert.strictEqual(res.body.error, "Required field missing");
        });
    });

    test("Solve a puzzle with invalid characters", () => {
      let puzzle = ".".repeat(81).split("");
      puzzle[0] = "D";
      puzzle[1] = "G";

      chai
        .request(server)
        .post("/api/solve")
        .send({ puzzle: puzzle.join("") })
        .end((err, res) => {
          assert.notProperty(res.body, "solution");
          assert.property(res.body, "error");
          assert.strictEqual(res.body.error, "Invalid characters in puzzle");
        });
    });

    test("Solve a puzzle with incorrect length", () => {
      const puzzle = ".".repeat(50).split("");
      chai
        .request(server)
        .post("/api/solve")
        .send({ puzzle })
        .end((err, res) => {
          assert.notProperty(res.body, "solution");
          assert.property(res.body, "error");
          assert.strictEqual(
            res.body.error,
            "Expected puzzle to be 81 characters long"
          );
        });
    });

    test("Solve a puzzle that cannot be solved", () => {
      let puzzle = puzzlesAndSolutions[0][0].split("");
      puzzle[0] = "1";
      puzzle[1] = "1";

      chai
        .request(server)
        .post("/api/solve")
        .send({ puzzle: puzzle.join("") })
        .end((err, res) => {
          assert.notProperty(res.body, "solution");
          assert.property(res.body, "error");
          assert.strictEqual(res.body.error, "Puzzle cannot be solved");
        });
    });
  });

  suite("POST /api/check", () => {
    test("Check a puzzle placement with all fields", () => {
      const [puzzle] = puzzlesAndSolutions[0];

      chai
        .request(server)
        .post("/api/check")
        .send({
          puzzle,
          coordinate: "A2",
          value: 3,
        })
        .end((err, res) => {
          assert.strictEqual(res.type, "application/json");

          assert.notProperty(res.body, "error");
          assert.notProperty(res.body, "conflict");
          assert.property(res.body, "valid");
          assert.strictEqual(res.body.valid, true);
        });
    });

    test("Check a puzzle placement with a single placement conflict", () => {
      const puzzle = ".".repeat(81).split("");
      puzzle[0] = "1";

      chai
        .request(server)
        .post("/api/check")
        .send({
          puzzle: puzzle.join(""),
          coordinate: "A4",
          value: 1,
        })
        .end((err, res) => {
          assert.strictEqual(res.type, "application/json");

          assert.notProperty(res.body, "error");
          assert.property(res.body, "valid");
          assert.strictEqual(res.body.valid, false);
          assert.property(res.body, "conflict");
          assert.isArray(res.body.conflict);
          assert.strictEqual(res.body.conflict.length, 1);
          assert.strictEqual(res.body.conflict[0], "row");
        });
    });

    test("Check a puzzle placement with multiple placement conflicts", () => {
      const puzzle = ".".repeat(81).split("");
      puzzle[0] = "1";

      chai
        .request(server)
        .post("/api/check")
        .send({
          puzzle: puzzle.join(""),
          coordinate: "C1",
          value: 1,
        })
        .end((err, res) => {
          assert.strictEqual(res.type, "application/json");

          assert.notProperty(res.body, "error");
          assert.property(res.body, "valid");
          assert.strictEqual(res.body.valid, false);
          assert.property(res.body, "conflict");
          assert.isArray(res.body.conflict);
          assert.strictEqual(res.body.conflict.length, 2);
          assert.isTrue(res.body.conflict.includes("region"));
          assert.isTrue(res.body.conflict.includes("column"));
        });
    });

    test("Check a puzzle placement with all placement conflicts", () => {
      const puzzle = ".".repeat(81).split("");
      puzzle[0] = "1"; // Cell A1
      puzzle[20] = "1"; // Cell C3

      chai
        .request(server)
        .post("/api/check")
        .send({
          puzzle: puzzle.join(""),
          coordinate: "C1",
          value: 1,
        })
        .end((err, res) => {
          assert.strictEqual(res.type, "application/json");

          assert.notProperty(res.body, "error");
          assert.property(res.body, "valid");
          assert.strictEqual(res.body.valid, false);
          assert.property(res.body, "conflict");
          assert.isArray(res.body.conflict);
          assert.strictEqual(res.body.conflict.length, 3);
          assert.isTrue(res.body.conflict.includes("region"));
          assert.isTrue(res.body.conflict.includes("column"));
          assert.isTrue(res.body.conflict.includes("row"));
        });
    });

    test("Check a puzzle placement with missing required fields", () => {
      chai
        .request(server)
        .post("/api/check")
        .send({
          value: 1,
        })
        .end((err, res) => {
          assert.strictEqual(res.type, "application/json");
          assert.notProperty(res.body, "valid");
          assert.notProperty(res.body, "conflict");
          assert.property(res.body, "error");
          assert.strictEqual(res.body.error, "Required field(s) missing");
        });
    });

    test("Check a puzzle placement with invalid characters", () => {
      const puzzle = ".".repeat(81).split("");
      puzzle[0] = "D";
      puzzle[1] = "G";

      chai
        .request(server)
        .post("/api/check")
        .send({
          puzzle: puzzle.join(""),
          value: 1,
          coordinate: "A1",
        })
        .end((err, res) => {
          assert.strictEqual(res.type, "application/json");
          assert.notProperty(res.body, "valid");
          assert.notProperty(res.body, "conflict");
          assert.property(res.body, "error");
          assert.strictEqual(res.body.error, "Invalid characters in puzzle");
        });
    });

    test("Check a puzzle placement with incorrect length", () => {
      const puzzle = ".".repeat(777);

      chai
        .request(server)
        .post("/api/check")
        .send({
          puzzle: puzzle,
          value: 1,
          coordinate: "A1",
        })
        .end((err, res) => {
          assert.strictEqual(res.type, "application/json");
          assert.notProperty(res.body, "valid");
          assert.notProperty(res.body, "conflict");
          assert.property(res.body, "error");
          assert.strictEqual(
            res.body.error,
            "Expected puzzle to be 81 characters long"
          );
        });
    });

    test("Check a puzzle placement with invalid placement coordinate", () => {
      const puzzle = ".".repeat(81);
      chai
        .request(server)
        .post("/api/check")
        .send({
          puzzle: puzzle,
          value: 1,
          coordinate: "J6",
        })
        .end((err, res) => {
          assert.strictEqual(res.type, "application/json");
          assert.notProperty(res.body, "valid");
          assert.notProperty(res.body, "conflict");
          assert.property(res.body, "error");
          assert.strictEqual(res.body.error, "Invalid coordinate");
        });
    });

    test("Check a puzzle placement with invalid placement value", () => {
      const puzzle = ".".repeat(81);
      chai
        .request(server)
        .post("/api/check")
        .send({
          puzzle: puzzle,
          value: 42,
          coordinate: "D6",
        })
        .end((err, res) => {
          assert.strictEqual(res.type, "application/json");
          assert.notProperty(res.body, "valid");
          assert.notProperty(res.body, "conflict");
          assert.property(res.body, "error");
          assert.strictEqual(res.body.error, "Invalid value");
        });
    });
  });
});
