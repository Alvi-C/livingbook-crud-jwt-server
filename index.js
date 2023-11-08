const express = require('express');
const cors = require('cors');
require('dotenv').config();
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 3000;

// third party middleware
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// our middleware
const verifyToken = async (req, res, next) => {
    const token = req.cookies?.token;
    // console.log('value of Token Middleware', token);
    if (!token) {
        return res.status(401).send({ message: 'unauthorized access' });
    }
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: 'unauthorized access' });
        }
        // console.log('Value in the token', decoded);
        req.user = decoded;
        next();
    });
};



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
        const bookingCollection = database.collection("bookings");
        const featuredCollection = database.collection("featured");

        // ---------- JWT authentication APIs --------------------
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            console.log(user);
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res
                .cookie('token', token, {
                    httpOnly: true,
                    secure: false,
                    // sameSite: 'none'
                })
                .send({ success: true, token })
        })

        app.post('/logout', async (req, res) => {
            const user = req.body;
            console.log('logged out :', user);
            res
                .clearCookie('token', {
                    maxAge: 0
                })
                .send({ success: true })
        })



        // ---------- Featured APIs --------------------
        // GET all featured data
        app.get('/featured', async (req, res) => {
            const cursor = featuredCollection.find({});
            const featured = await cursor.toArray();
            res.send(featured);
        })


        // ---------- Bookings APIs --------------------
        // GET endpoint to get the data by query parameters to check if booking exists or not with hotelId, bookingDate and userEmail
        app.get('/bookings', async (req, res) => {
            const query = req.query;
            // console.log('query:', query);
            const cursor = bookingCollection.find(query);
            const bookings = await cursor.toArray();
            res.send(bookings);
        })

        // GET endpoint to get specific user's bookings data by verifying token
        app.get('/bookings', verifyToken, async (req, res) => {
            // console.log('tok-tok', req.cookies.token);

            if (req.query?.email !== req.user?.email) {
                return res.status(403).send({ message: 'forbidden access' })
            }

            let query = {}
            if (req.query?.email) {
                query = { email: req.query.email }
            }
            const cursor = bookingCollection.find(query);
            const result = await cursor.toArray();
            res.json(result);

        })


        // PUT endpoint to update booking date
        app.put('/bookings/:id', verifyToken, async (req, res) => {
            const { id } = req.params;
            const { bookingDate } = req.body;

            // check if the user is authorized to update the booking
            const booking = await bookingCollection.findOne({ _id: new ObjectId(id) });
            if (!booking) {
                return res.status(404).send({ message: 'Booking not found' });
            }
            if (booking.userEmail !== req.user.email) {
                return res.status(403).send({ message: 'Forbidden access' });
            }

            // update the booking date
            const result = await bookingCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: { bookingDate: bookingDate } }
            );

            if (result.modifiedCount === 1) {
                res.send({ message: 'Booking date updated successfully' });
            } else {
                res.status(500).send({ message: 'Failed to update booking date' });
            }
        });



        // POST endpoint to create a booking
        app.post('/bookings', async (req, res) => {
            const bookingData = req.body;
            // console.log('bookingData:', bookingData);
            try {
                // Check for existing booking
                const existingBooking = await bookingCollection.findOne({
                    hotelId: bookingData.hotelId,
                    bookingDate: bookingData.bookingDate,
                    userEmail: bookingData.userEmail
                });
                if (existingBooking) {
                    return res.send({ message: 'Booking already exists for this date.' });
                } else {
                    // Insert booking into bookingCollection
                    await bookingCollection.insertOne(bookingData);
                }

                // Return confirmation of booking creation
                res.status(201).send({ message: 'Booking created successfully.', bookingId: bookingData._id });
            } catch (error) {
                res.status(500).send(error);
            }
        });



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
