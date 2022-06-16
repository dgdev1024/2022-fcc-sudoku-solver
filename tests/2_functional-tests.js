const chai = require("chai");
const chaiHttp = require("chai-http");
const assert = chai.assert;
const server = require("../server");
const { puzzlesAndSolutions } = require("../controllers/puzzle-strings");

chai.use(chaiHttp);

suite("Functional Tests", () => {
  suite("POST /api/solve", () => {
    test("Solve a puzzle with a valid puzzle string", async () => {
      const [puzzle, solution] = puzzlesAndSolutions[0];

      const res = await chai
        .request(server)
        .post("/api/solve")
        .send({ puzzle });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.type, "application/json");

      assert.notProperty(res.body, "error");
      assert.property(res.body, "solution");
      assert.strictEqual(res.body.solution, solution);
    });

    test("Solve a puzzle with a missing puzzle string", async () => {
      const res = await chai
        .request(server)
        .post("/api/solve")
        .send({ puzzle: undefined });

      assert.notProperty(res.body, "solution");
      assert.property(res.body, "error");
      assert.strictEqual(res.body.error, "Required field missing");
    });

    test("Solve a puzzle with invalid characters", async () => {
      let puzzle = ".".repeat(81).split("");
      puzzle[0] = "D";
      puzzle[1] = "G";

      const res = await chai
        .request(server)
        .post("/api/solve")
        .send({ puzzle: puzzle.join("") });

      assert.notProperty(res.body, "solution");
      assert.property(res.body, "error");
      assert.strictEqual(res.body.error, "Invalid characters in puzzle");
    });

    test("Solve a puzzle with incorrect length", async () => {
      const puzzle = ".".repeat(50).split("");
      const res = await chai
        .request(server)
        .post("/api/solve")
        .send({ puzzle });

      assert.notProperty(res.body, "solution");
      assert.property(res.body, "error");
      assert.strictEqual(
        res.body.error,
        "Expected puzzle to be 81 characters long"
      );
    });

    test("Solve a puzzle that cannot be solved", async () => {
      let puzzle = puzzlesAndSolutions[0][0].split("");
      puzzle[0] = "1";
      puzzle[1] = "1";

      const res = await chai
        .request(server)
        .post("/api/solve")
        .send({ puzzle: puzzle.join("") });

      assert.notProperty(res.body, "solution");
      assert.property(res.body, "error");
      assert.strictEqual(res.body.error, "Puzzle cannot be solved");
    });
  });

  suite("POST /api/check", () => {
    test("Check a puzzle placement with all fields", async () => {
      const [puzzle] = puzzlesAndSolutions[0];

      const res = await chai.request(server).post("/api/check").send({
        puzzle,
        coordinate: "A2",
        value: 3,
      });

      assert.strictEqual(res.type, "application/json");

      assert.notProperty(res.body, "error");
      assert.notProperty(res.body, "conflict");
      assert.property(res.body, "valid");
      assert.strictEqual(res.body.valid, true);
    });

    test("Check a puzzle placement with a single placement conflict", async () => {
      const puzzle = ".".repeat(81).split("");
      puzzle[0] = "1";

      const res = await chai
        .request(server)
        .post("/api/check")
        .send({
          puzzle: puzzle.join(""),
          coordinate: "A4",
          value: 1,
        });

      assert.strictEqual(res.type, "application/json");

      assert.notProperty(res.body, "error");
      assert.property(res.body, "valid");
      assert.strictEqual(res.body.valid, false);
      assert.property(res.body, "conflict");
      assert.isArray(res.body.conflict);
      assert.strictEqual(res.body.conflict.length, 1);
      assert.strictEqual(res.body.conflict[0], "row");
    });

    test("Check a puzzle placement with multiple placement conflicts", async () => {
      const puzzle = ".".repeat(81).split("");
      puzzle[0] = "1";

      const res = await chai
        .request(server)
        .post("/api/check")
        .send({
          puzzle: puzzle.join(""),
          coordinate: "C1",
          value: 1,
        });

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

    test("Check a puzzle placement with all placement conflicts", async () => {
      const puzzle = ".".repeat(81).split("");
      puzzle[0] = "1"; // Cell A1
      puzzle[20] = "1"; // Cell C3

      const res = await chai
        .request(server)
        .post("/api/check")
        .send({
          puzzle: puzzle.join(""),
          coordinate: "C1",
          value: 1,
        });

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

    test("Check a puzzle placement with missing required fields", async () => {
      const res = await chai.request(server).post("/api/check").send({
        value: 1,
      });

      assert.strictEqual(res.type, "application/json");
      assert.notProperty(res.body, "valid");
      assert.notProperty(res.body, "conflict");
      assert.property(res.body, "error");
      assert.strictEqual(res.body.error, "Required field(s) missing");
    });

    test("Check a puzzle placement with invalid characters", async () => {
      const puzzle = ".".repeat(81).split("");
      puzzle[0] = "D";
      puzzle[1] = "G";

      const res = await chai
        .request(server)
        .post("/api/check")
        .send({
          puzzle: puzzle.join(""),
          value: 1,
          coordinate: "A1",
        });

      assert.strictEqual(res.type, "application/json");
      assert.notProperty(res.body, "valid");
      assert.notProperty(res.body, "conflict");
      assert.property(res.body, "error");
      assert.strictEqual(res.body.error, "Invalid characters in puzzle");
    });

    test("Check a puzzle placement with incorrect length", async () => {
      const puzzle = ".".repeat(777);

      const res = await chai.request(server).post("/api/check").send({
        puzzle: puzzle,
        value: 1,
        coordinate: "A1",
      });

      assert.strictEqual(res.type, "application/json");
      assert.notProperty(res.body, "valid");
      assert.notProperty(res.body, "conflict");
      assert.property(res.body, "error");
      assert.strictEqual(
        res.body.error,
        "Expected puzzle to be 81 characters long"
      );
    });

    test("Check a puzzle placement with invalid placement coordinate", async () => {
      const puzzle = ".".repeat(81);
      const res = await chai.request(server).post("/api/check").send({
        puzzle: puzzle,
        value: 1,
        coordinate: "J6",
      });

      assert.strictEqual(res.type, "application/json");
      assert.notProperty(res.body, "valid");
      assert.notProperty(res.body, "conflict");
      assert.property(res.body, "error");
      assert.strictEqual(res.body.error, "Invalid coordinate");
    });

    test("Check a puzzle placement with invalid placement value", async () => {
      const puzzle = ".".repeat(81);
      const res = await chai.request(server).post("/api/check").send({
        puzzle: puzzle,
        value: 42,
        coordinate: "D6",
      });

      assert.strictEqual(res.type, "application/json");
      assert.notProperty(res.body, "valid");
      assert.notProperty(res.body, "conflict");
      assert.property(res.body, "error");
      assert.strictEqual(res.body.error, "Invalid value");
    });
  });
});
