const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 3000;

// third party middleware
app.use(cors());
app.use(express.json());


// check server is running or not
app.get('/', (req, res) => {
    res.send('Living Book server is running')
})

// database
// Accessing Secrets
const { MONGO_URI, DB_NAME } = process.env;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(MONGO_URI, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});

async function run() {
    try {
        // Connect the client to the server (optional starting in v4.7)
        await client.connect();

        // create database and collections to store data
        const database = client.db(DB_NAME);
        const propertyCollection = database.collection('properties');
        const userCollection = database.collection("users");

        // ---------- USER APIs --------------------
        // POST user data
        app.post('/users', async (req, res) => {
            try {
                const user = req.body;
                const result = await userCollection.insertOne(user);
                res.send(result);
            } catch (error) {
                res.status(500).send(error);
            }
        });


        // GET user data
        app.get('/users', async (req, res) => {
            try {
                const cursor = userCollection.find({});
                const result = await cursor.toArray();
                res.send(result);
            } catch (error) {
                res.status(500).send(error);
            }
        });


        // ---------- PROPERTY APIs --------------------
        // API to add a property
        app.post('/properties', async (req, res) => {
            try {
                const property = req.body;
                console.log(property);
                const result = await propertyCollection.insertOne(property);
                res.status(201).json(result);
            } catch (error) {
                res.status(500).json({ message: error.message });
            }
        });


        // API to get all properties
        app.get('/properties', async (req, res) => {
            try {
                const cursor = propertyCollection.find({});
                const properties = await cursor.toArray();
                res.status(200).json(properties);
            } catch (error) {
                res.status(500).json({ message: error.message });
            }
        });

        // API to get a single property by id
        app.get('/properties/:id', async (req, res) => {
            try {
                const id = req.params.id;
                const query = { _id: new ObjectId(id) };
                const property = await propertyCollection.findOne(query);
                if (property) {
                    res.status(200).json(property);
                } else {
                    res.status(404).json({ message: 'Property not found' });
                }
            } catch (error) {
                res.status(500).json({ message: error.message });
            }
        });

        // API to update a property
        app.put('/properties/:id', async (req, res) => {
            try {
                const id = req.params.id;
                const updatedProperty = req.body;
                const filter = { _id: new ObjectId(id) };
                const options = { upsert: true };
                const updateDoc = { $set: updatedProperty };
                const result = await propertyCollection.updateOne(filter, updateDoc, options);
                res.status(200).json(result);
            } catch (error) {
                res.status(500).json({ message: error.message });
            }
        });

        // API to delete a property
        app.delete('/properties/:id', async (req, res) => {
            try {
                const id = req.params.id;
                const query = { _id: new ObjectId(id) };
                const result = await propertyCollection.deleteOne(query);
                if (result.deletedCount === 1) {
                    res.status(200).json(result);
                } else {
                    res.status(404).json({ message: 'Property not found' });
                }
            } catch (error) {
                res.status(500).json({ message: error.message });
            }
        });


        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");

        // If MongoDB connection is successful, start the server
        app.listen(port, () => {
            console.log(`Living Book server is running on port ${port}`);
        });
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
    }
}

run().catch(console.dir);
