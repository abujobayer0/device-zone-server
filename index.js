const express = require("express");
const cors = require("cors");
const app = express();
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const secretKey = "your-secret-key";
const port = 7000;

// Enable CORS
app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ limit: "10mb", extended: true }));
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri =
  "mongodb+srv://munna:I5l3XBblNYwiI1bt@cluster0.dpihtss.mongodb.net/?retryWrites=true&w=majority";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
const userCollection = client.db("main").collection("user-collection");
const productCollection = client.db("main").collection("product-collection");
const reviewCollection = client.db("main").collection("product-reviews");
const cartCollection = client.db("main").collection("product-added-carts");

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const generateToken = (userData) => {
      return jwt.sign(userData, secretKey, { expiresIn: "1h" }); // Token will expire in 1 hour
    };
    // Middleware to verify JWT
    const verifyToken = (req, res, next) => {
      const token = req.headers["authorization"];
      if (!token) {
        return res.status(403).send("Access denied. No token provided.");
      }

      jwt.verify(token, secretKey, (err, decoded) => {
        if (err) {
          return res.status(401).send("Invalid token.");
        }
        req.user = decoded;
        next();
      });
    };
    app.get("/", (req, res) => {
      res.send("Hello, world!");
    });

    app.post("/user/create", async (req, res) => {
      const { email, address, zipCode, isSeller, isAdmin, userName } = req.body;
      const new_user = {
        email: email,
        address: address,
        zipCode: zipCode,
        isSeller: isSeller,
        isAdmin: isAdmin,
        userName: userName,
      };

      try {
        const checkDuplicate = await userCollection.findOne({ email: email });

        if (checkDuplicate) {
          const errorMessage = "User already exists";
          res.status(400).send(errorMessage);
        } else {
          const result = await userCollection.insertOne(new_user);
          res.send(result);
          console.log(new_user);
        }
      } catch (error) {
        console.error("Error inserting user into the database:", error);
        res.status(500).send("Server error");
      }
    });
    app.post("/add/cart", async (req, res) => {
      const { email, productId } = req.body;
      const isProductExits = await cartCollection
        .find({ customerEmail: email, productId: productId })
        .toArray();
      if (isProductExits.length > 0) {
        res.json({ message: "Product Already Added To Cart" });
        return;
      } else {
        const result = await cartCollection.insertOne({
          customerEmail: email,
          productId: productId,
          data: new Date(),
        });
        console.log(email, productId);
        res.send(result);
      }
    });
    cartCollection.de;
    app.get("/cart", async (req, res) => {
      try {
        const email = req.query.email;
        const usersWhoAddedCart = await cartCollection
          .find({
            customerEmail: email,
          })
          .toArray();
        const userCartIds = await usersWhoAddedCart.map((i) => i.productId);

        const result = await productCollection
          .find({ _id: { $in: userCartIds.map((id) => new ObjectId(id)) } })
          .sort({ data: 1 })
          .toArray();

        res.send(result);
      } catch (error) {
        console.error("Error occurred:", error);
        res.status(500).send("An error occurred while fetching the data.");
      }
    });
    app.get("/cart/wishlist", async (req, res) => {
      const data = req.query.data;
      console.log(data);

      if (!data) {
        res.send([]);
        return;
      }

      const dataArray = data.split(",");
      const result = await productCollection
        .find({
          _id: { $in: dataArray.map((item) => new ObjectId(item)) },
        })
        .toArray();
      res.send(result);
    });
    app.delete("/cart/product/delete", async (req, res) => {
      const email = req.query.email;
      const id = req.query.id;
      console.log(id, email);
      const query = { productId: id, customerEmail: email };
      const result = await cartCollection.deleteOne(query);
      res.send(result);
    });
    app.get("/cart/added", async (req, res) => {
      const result = await cartCollection.find().toArray();
      res.send(result);
    });

    app.post("/review", async (req, res) => {
      const { email, productId, sellerEmail, sellerId, review } = req.body;
      const result = await reviewCollection.insertOne({
        customerEmail: email,
        productId: productId,
        review: review,
        sellerEmail: sellerEmail,
        sellerId: sellerId,
        data: new Date(),
      });
      res.send(result);
    });
    app.get("/review", async (req, res) => {
      const { email, productId, sellerEmail, sellerId } = req.query;
      const query = {
        customerEmail: email,
        productId: productId,
        sellerEmail: sellerEmail,
        sellerId: sellerId,
      };
      const result = await reviewCollection.find(query).toArray();
      res.send(result);
    });
    app.get("/reviews", async (req, res) => {
      const result = await reviewCollection.find().toArray();
      res.send(result);
    });
    app.post("/create/product", async (req, res) => {
      const {
        productName,
        description,
        price,
        discountPercent,
        colorVariation,
        selectedImages,
        discountedPrice,
        categories,
        seller,
        type,
      } = req.body;

      const result = await productCollection.insertOne({
        productName,
        description: description,
        price: price,
        discountPercent: discountPercent,
        colorVariation: colorVariation,
        selectedImages: selectedImages,
        discountedPrice: discountedPrice,
        categories: categories,
        seller: seller,
        type: type,
      });
      res.send(result);
    });
    app.get("/user", async (req, res) => {
      const email = req.query.email;
      const collection = await userCollection.findOne({ email: email });
      res.send(collection);
    });

    app.get("/products", async (req, res) => {
      const collection = await productCollection.find().toArray();
      res.send(collection);
    });
    app.get("/products/featured", async (req, res) => {
      const collection = await productCollection
        .find({ categories: "Featured" })
        .toArray();
      res.send(collection);
    });
    app.get("/products/newarrival", async (req, res) => {
      const collection = await productCollection
        .find({ categories: "New Arrival" })
        .toArray();
      res.send(collection);
    });
    app.delete("/delete/product/:id", async (req, res) => {
      const { id } = req.params;
      const query = { _id: new ObjectId(id) };
      const result = productCollection.deleteOne(query);
      res.send(result);
    });

    app.get("/products/hotdeal", async (req, res) => {
      const collection = await productCollection
        .find({ categories: "Hot Deal" })
        .toArray();
      res.send(collection);
    });
    app.get("/products/search", async (req, res) => {
      const query = req.query.query;
      const regex = new RegExp(query, "i");
      const collection = await productCollection
        .find({
          productName: { $regex: regex },
        })
        .toArray();
      res.send(collection);
    });
    app.put("/product/update/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const query = { _id: new ObjectId(id) };
        const existingProduct = await productCollection.findOne(query);

        if (!existingProduct) {
          return res.status(404).json({ error: "Product not found." });
        }

        const updateFields = {};
        const {
          productName,
          description,
          price,
          discountPercent,
          discountedPrice,
          colorVariation,
        } = req.body;

        if (productName) {
          updateFields.productName = productName;
        }

        if (description) {
          updateFields.description = description;
        }

        if (price) {
          updateFields.price = price;
        }

        if (discountPercent) {
          updateFields.discountPercent = discountPercent;
        }

        if (discountedPrice) {
          updateFields.discountedPrice = discountedPrice;
        }

        if (colorVariation) {
          updateFields.colorVariation = colorVariation;
        }

        const result = await productCollection.updateOne(query, {
          $set: updateFields,
        });

        if (result.modifiedCount > 0) {
          return res.json({ message: "Product updated successfully." });
        } else {
          return res.json({ message: "No changes made to the product." });
        }
      } catch (error) {
        return res.status(500).json({ error: "Internal server error." });
      }
    });
    app.get("/products/filter", async (req, res) => {
      const { category, color, sort, minPrice, maxPrice, type } = req.query;
      console.log(category, color, sort, minPrice, maxPrice, type);

      const sortQuery =
        sort === "name_a_to_z"
          ? { productName: 1 }
          : sort === "name_z_to_a"
          ? { productName: -1 }
          : sort === "price_low_to_high"
          ? { price: 1 }
          : sort === "price_high_to_low"
          ? { price: -1 }
          : {};

      if (sort !== "") {
        const result = await productCollection
          .aggregate([
            {
              $match: {
                categories: new RegExp(category, "i"),
                colorVariation: new RegExp(color, "i"),
                type: new RegExp(type, "i"),
                price: { $gte: parseInt(minPrice), $lte: parseInt(maxPrice) },
              },
            },
          ])
          .sort(sortQuery)
          .toArray();
        res.send(result);
      } else {
        const result = await productCollection
          .aggregate([
            {
              $match: {
                categories: new RegExp(category, "i"),
                colorVariation: new RegExp(color, "i"),
                type: new RegExp(type, "i"),
                price: { $gte: parseInt(minPrice), $lte: parseInt(maxPrice) },
              },
            },
          ])

          .toArray();
        res.send(result);
      }
    });
    app.get("/products/recomended", async (req, res) => {
      const type = req.query.type;
      const collection = await productCollection
        .find({ type: type })
        .limit(6)
        .toArray();
      res.send(collection);
    });
    app.get("/products/type", async (req, res) => {
      const type = req.query.type;

      const collection = await productCollection.find({ type: type }).toArray();
      res.send(collection);
    });

    app.get("/seller/products", async (req, res) => {
      const email = req.query.email;
      const collection = await productCollection
        .find({ "seller.email": email })
        .toArray();
      res.send(collection);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
run().catch(console.dir);

// Create a route for the home page

// Listen on the port
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
