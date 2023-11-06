const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());


// check server is running or not
app.get('/', (req, res) => {
    res.send('Living Book server is running')
})




app.listen(port, () => {
    console.log(`Living Book server is running on port ${port}`)
})
