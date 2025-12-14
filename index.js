const express = require("express");
const app = express();
const cors = require("cors");
const dotenv = require("dotenv");
const admin = require("firebase-admin");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");


dotenv.config();
const port = process.env.PORT || 3000;

// middlewares
app.use(cors());
app.use(express.json());

// firebase admin init
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

//verify firebase token middleware
const verifyFirebaseToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).send({ message: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1]; // Bearer
    const decodedUser = await admin.auth().verifyIdToken(token);

    req.user = decodedUser; // uid, email
    next();
  } catch (error) {
    return res.status(401).send({ message: "Invalid token" });
  }
};

module.exports = { admin, verifyFirebaseToken };





//mongodb-uri
const uri = process.env.MONGO_URI;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();

    const db = client.db("microcredx");
    const allloan = db.collection("allloan");
    const userCollection = db.collection("user");
    const loanApplication = db.collection("loan-application");

    //update admin request loan
    app.put("/update-adminloan/:id", async (req, res) => {
      try {
        const id = req.params.id;

        const {
          title,
          image,
          shortDesc,
          description,
          category,
          interestRate,
          maxLimit,
          emiPlans,
          showOnHome,
        } = req.body;

        const result = await allloan.updateOne(
          { _id: new ObjectId(id) },
          {
            $set: {
              title,
              image,
              shortDesc,
              description,
              category,
              interestRate,
              maxLimit,
              emiPlans,
              showOnHome,
              updatedAt: new Date(),
            },
          }
        );

        if (result.matchedCount === 0) {
          return res.status(404).send({ message: "Loan not found" });
        }

        res.send({ success: true, modifiedCount: result.modifiedCount });
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Failed to update loan" });
      }
    });

    //get-all-loan for admin
    app.get("/all-adminloan",verifyFirebaseToken, async (req, res) => {
      const result = await loanApplication.find().toArray();
      res.send(result);
    });

    //update-role-api
    app.patch("/update-role/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const { role } = req.body;

        const query = { _id: new ObjectId(id) };
        const update = {
          $set: {
            role: role,
          },
        };
        const result = await userCollection.updateOne(query, update);
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to update role" });
      }
    });

    //all-loan
    app.get("/all-loan", async (req, res) => {
      // const { email } = req.query;
      const result = await allloan.find().toArray();
      res.send(result);
    });

    //all-user-api
    app.get("/all-user", async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    //delete-loan
    app.delete("/delete-loan/:id", async (req, res) => {
      const id = req.params.id;
      const result = await allloan.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    //update-loan
    app.put("/update-loan/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const { title, shortDesc, interestRate, maxLimit, category, image } =
          req.body;

        const result = await allloan.updateOne(
          { _id: new ObjectId(id) },
          {
            $set: {
              title,
              shortDesc,
              interestRate,
              maxLimit,
              category,
              image,
              updatedAt: new Date(),
            },
          }
        );

        if (result.matchedCount === 0) {
          return res.status(404).send({ message: "Loan not found" });
        }

        res.send({ success: true, updatedCount: result.modifiedCount });
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Failed to update loan" });
      }
    });

    //pending-loan-count
    app.get("/pending-loans-count", async (req, res) => {
      try {
        const count = await loanApplication.countDocuments({
          status: "Pending",
        });

        res.send({ count });
      } catch (error) {
        res.status(500).send({ message: "Failed to get count" });
      }
    });

    //manager created loan
    app.get("/create-loan", async (req, res) => {
      const { email } = req.query;
      const result = await allloan
        .find({
          createdBy: email,
        })
        .toArray();
      res.send(result);
    });

    //add-loan
    app.post("/add-loan", async (req, res) => {
      try {
        const loan = req.body;
        const now = new Date();

        const data = {
          ...loan,
          createdAt: loan.createdAt || now.toISOString(),
          updatedAt: loan.updatedAt || now.toISOString(),
        };

        const result = await allloan.insertOne(data);
        res.send(result);
      } catch (err) {
        res.status(500).send({ message: "Failed to save loan" });
      }
    });

    //get all approved loan application
    app.get("/get-Approved-loans", async (req, res) => {
      const { email } = req.query;
      const result = await loanApplication
        .find({ status: "Approved" })
        .toArray();
      res.send(result);
    });

    //update loan status
    app.patch("/loan-status/:id", async (req, res) => {
      try {
        const { status } = req.body;
        const id = req.params.id;

        const result = await loanApplication.updateOne(
          {
            _id: new ObjectId(id),
          },
          {
            $set: {
              status: status,
              updatedAt: new Date(),
            },
          }
        );
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to update status" });
      }
    });

    //get all pending loan application
    app.get("/get-allloans", async (req, res) => {
      const { email } = req.query;
      const result = await loanApplication
        .find({ status: "Pending" })
        .toArray();
      res.send(result);
    });

    //delete-loan
    app.delete("/delete-loan/:id", async (req, res) => {
      const id = req.params.id;

      const result = await loanApplication.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    //loanapplication find with email
    app.get("/get-loan", async (req, res) => {
      const { email } = req.query;
      const result = await loanApplication.find({ email }).toArray();
      res.send(result);
    });

    //get 6 loan
    app.get("/home-loans", async (req, res) => {
      try {
        const result = await allloan.find({ showOnHome: true }).toArray();

        res.send({
          status: "success",
          count: result.length,
          data: result,
        });
      } catch (error) {
        console.error("Error fetching home loans:", error);
        res
          .status(500)
          .send({ status: "error", message: "Internal Server Error" });
      }
    });

    //all loan
    app.get("/home-allloans", async (req, res) => {
      try {
        const result = await allloan.find().toArray();

        res.send({
          status: "success",
          count: result.length,
          data: result,
        });
      } catch (error) {
        console.error("Error fetching home loans:", error);
        res
          .status(500)
          .send({ status: "error", message: "Internal Server Error" });
      }
    });

    //loan-details
    app.get("/loan-details/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const loan = await allloan.findOne({ _id: new ObjectId(id) });

        if (!loan) {
          return res.status(404).json({
            success: false,
            message: "Loan Not Found",
          });
        }

        res.json({
          success: true,
          data: loan,
        });
      } catch (error) {
        console.error(error);
        res.status(500).json({
          success: false,
          message: "Server error",
        });
      }
    });

    //user
    app.post("/save-user", async (req, res) => {
      try {
        const { name, email, role } = req.body;
        let user = await userCollection.findOne({ email });

        if (!user) {
          const newUser = {
            name,
            email,
            role: role ? role : "borrower",
            createdAt: new Date(),
          };

          await userCollection.insertOne(newUser);
          user = newUser;
        }

        res.json(user);
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    });

    //get user rol
    app.get("/user-role/:email", async (req, res) => {
      try {
        const email = req.params.email;

        const user = await userCollection.findOne({ email });

        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        res.json({ role: user.role });
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    });

    //loan application
    app.post("/save-loan", async (req, res) => {
      try {
        const {
          email,
          loanTitle,
          interestRate,
          firstName,
          lastName,
          contactNumber,
          nationalId,
          incomeSource,
          monthlyIncome,
          loanAmount,
          reason,
          address,
          extraNotes,
        } = req.body;

        let application = false;

        // If not, create new loan application
        if (!application) {
          const newApplication = {
            email,
            loanTitle,
            interestRate,
            firstName,
            lastName,
            contactNumber,
            nationalId,
            incomeSource,
            monthlyIncome,
            loanAmount,
            reason,
            address,
            extraNotes,
            status: "Pending",
            applicationFeeStatus: "unpaid",
            createdAt: new Date(),
          };

          const result = await loanApplication.insertOne(newApplication);
          return res.json(result);
        }

        // If exists → update existing
        const updated = await loanApplication.updateOne(
          { email },
          {
            $set: {
              loanTitle,
              interestRate,
              firstName,
              lastName,
              contactNumber,
              nationalId,
              incomeSource,
              monthlyIncome,
              loanAmount,
              reason,
              address,
              extraNotes,
              updatedAt: new Date(),
            },
          }
        );

        res.json(updated);
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("server is runnig..");
});

app.listen(port, () => {
  console.log(`server runnig on port ${port}`);
});
