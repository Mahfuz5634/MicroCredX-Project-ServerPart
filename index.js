const express = require("express");
const app = express();
const cors = require("cors");
const dotenv = require("dotenv");
const port = process.env.PORT || 3000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

app.use(cors());
app.use(express.json());
dotenv.config();

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



    //add-loan
    app.post("/add-loan",async (req,res)=>{
      try{
        const loan=req.body;
        const now=new Date();

        const data={
          ...loan,
          createdAt:loan.createdAt || now.toISOString(),
          updatedAt: loan.updatedAt || now.toISOString(),
        };

        const result=await allloan.insertOne(data);
        res.send(result);
      }
      catch(err){
        res.status(500).send({message:"Failed to save loan"})
      }
    })

     //get all approved loan application
    app.get("/get-Approved-loans", async (req, res) => {
      const { email } = req.query;
      const result = await loanApplication.find({status:"Approved"}).toArray();
      res.send(result);
    });

   

    //update loan status
    app.patch('/loan-status/:id',async(req,res)=>{
      try{
        const {status}=req.body;
        const id=req.params.id;

        const result= await loanApplication.updateOne(
          {
            _id: new ObjectId(id)
          },
          {
            $set:{
              status:status,
              updatedAt: new Date(),
            }
          }
        );
        res.send(result)

      }
      catch(error){
        res.status(500).send({message:"Failed to update status"});
      }
    });

    //get all pending loan application
    app.get("/get-allloans", async (req, res) => {
      const { email } = req.query;
      const result = await loanApplication.find({status:"Pending"}).toArray();
      res.send(result);
    });


    //delete-loan
    app.delete('/delete-loan/:id',async(req,res)=>{
       const id=req.params.id;

       const result=await loanApplication.deleteOne({_id: new ObjectId(id)});
       res.send(result);
    })

    //loanapplication find with email
    app.get("/get-loan", async (req, res) => {
      const { email } = req.query;
      const result = await loanApplication.find({ email }).toArray();
      res.send(result);
    });

    //get 6 loan
    app.get("/home-loans", async (req, res) => {
      try {
        const result = await allloan
          .find({ showOnHome: true })
          .toArray();

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
