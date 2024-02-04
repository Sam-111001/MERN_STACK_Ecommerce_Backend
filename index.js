//---------Importing required dependencies----------------------------------------------------------------------------------
const jwt = require("jsonwebtoken");
const multer = require("multer");
const mongoose = require("mongoose");
const express = require("express");
const path = require("path");
const cors = require("cors");

const port = 4000; //Defining port number
const app = express(); //Creating express instance
app.use(express.json());
app.use(cors());

//---------Database connection with mongodb Atlas---------------------------------------------------------------------------
mongoose
  .connect(
    "mongodb+srv://Shamant:Mahantesh1.@cluster0.cldxice.mongodb.net/e-commerce"
  )
  .then(console.log("Connected"));

//-----------Creating a model for product collection using a schema---------------------------------------------------------
const Product = mongoose.model("Product", {
  id: {
    type: Number,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  new_price: {
    type: Number,
    required: true,
  },
  old_price: {
    type: Number,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  available: {
    type: Boolean,
    default: true,
  },
});

//-----------------Schema for user model--------------------------------------------------------------------
const Users = mongoose.model("User", {
  name: {
    type: String,
  },
  email: {
    type: String,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  cartData: {
    type: Object,
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

//------------Creating Image storage engine------------------------------------------------------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    return cb(null, "./upload/images");
  },
  filename: (req, file, cb) => {
    return cb(
      null,
      `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`
    );
  },
});
const upload = multer({ storage });

//------------API endpoint creation-----------------------------------------------------------------------------------
app.get("/", (req, res) => {
  res.send("Express App is Running");
});

//-------Creating upload endpoint for images-------------------------------------------------------------------------
app.use("/images", express.static("upload/images"));
app.post("/upload", upload.single("product"), (req, res) => {
  res.json({
    success: 1,
    image_url: `http://localhost:${port}/images/${req.file.filename}`,
  });
});

//------addProduct endpoint-----------------------------------------------------------------------------------------
app.post("/addProduct", async (req, res) => {
  console.log(req);
  let products = await Product.find({});
  let id;
  if (products.length > 0) {
    let last_product_array = products.slice(-1);
    let last_product = last_product_array[0];
    id = last_product.id + 1;
  } else {
    id = 1;
  }
  const product = new Product({ ...req.body, id: id });
  console.log(product);
  await product.save();
  console.log("Saved");
  res.json({
    success: true,
    name: req.body.name,
  });
});

//----------------removeProduct endpoint---------------------------------------------------------------------------
app.post("/removeProduct", async (req, res) => {
  await Product.findOneAndDelete({ id: req.body.id });
  console.log("Removed");
  res.json({
    success: true,
    name: req.body.name,
  });
});

//---------allProducts endpoint----------------------------------------------
app.get("/allProducts", async (req, res) => {
  const products = await Product.find({});
  console.log("All Products Fetched");
  res.send(products);
});

//--------Api for registring the user---------------------
app.post("/signUp", async (req, res) => {
  let check = await Users.findOne({ email: req.body.email });
  if (check) {
    return res
      .status(400)
      .json({ success: false, errors: "Email already exists." });
  }

  let cart = {};
  for (let i = 1; i <= 300; i++) {
    cart[i] = 0;
  }

  const user = new Users({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    cartData: cart,
  });
  await user.save();
  const data = {
    id: user.id,
  };

  const token = jwt.sign(data, "secret_ecom");
  res.json({ success: true, token });
});

//-----new collection api-------------------------------
app.get("/newCollection", async (req, res) => {
  let products = await Product.find({});
  let newcollection = products.slice(0).slice(-8);
  console.log("New collection fetched");
  res.send(newcollection);
});

//----------popular in women api--------------------------
app.get("/popularInWomen", async (req, res) => {
  let products = await Product.find({ category: "women" });
  let popularInWomen = products.slice(-4);
  console.log("popular in women fetched");
  res.send(popularInWomen);
});

//---------creating middleware to fetch user---------------
const fetchUser = async (req, res, next) => {
  const token = req.header("auth-token");
  if (!token) {
    res.status(401).send({ errors: "please authenticate using valid token" });
  } else {
    try {
      const data = jwt.verify(token, "secret_ecom");
      req.user = data;
      next();
    } catch (error) {
      res.status(401).send({ errors: "Please authenticate." });
    }
  }
};

//---------add to cart api---------------------
app.post("/addToCart", fetchUser, async (req, res) => {
  let userData = await Users.findOne({ _id: req.user.id });
  userData.cartData[req.body.itemID] += 1;
  await Users.findOneAndUpdate(
    { _id: req.user.id },
    { cartData: userData.cartData }
  );
  res.send("Added");
});

//----------remove from cart api----------------------
app.post("/removeFromCart", fetchUser, async (req, res) => {
  let userData = await Users.findOne({ _id: req.user.id });
  if (userData.cartData[req.body.itemID] > 0) {
    userData.cartData[req.body.itemID] -= 1;
  }
  await Users.findOneAndUpdate(
    { _id: req.user.id },
    { cartData: userData.cartData }
  );
  res.send("removed");
});

//-----------get cart data api------------------------------
app.post("/getCart", fetchUser, async (req, res) => {
  let userData = await Users.findOne({ _id: req.user.id });
  res.json(userData.cartData);
});

//------login API ----------------------------------------
app.post("/login", async (req, res) => {
  let user = await Users.findOne({ email: req.body.email });
  if (user) {
    const passCompare = req.body.password === user.password;
    if (passCompare) {
      const data = {
        id: user.id,
      };
      const token = jwt.sign(data, "secret_ecom");
      res.json({
        success: true,
        token,
      });
    } else {
      res.json({
        success: false,
        errors: "Password is incorrect",
      });
    }
  } else {
    res.json({ success: false, errors: "User not found" });
  }
});

//--------API connection establishment------------------------------------------------------------------------------
app.listen(port, (error) => {
  if (!error) {
    console.log("Surver running on Port: " + port);
  } else {
    console.log("Error: " + error);
  }
});
