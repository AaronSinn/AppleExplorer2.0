// Load environment variables
require("dotenv").config();

// Modules
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const csv = require("csv-parser");
const fs = require("fs");
const path = require("path");
const { Parser } = require("json2csv");
const session = require("express-session");
const passport = require("passport");
const { GridFSBucket } = require("mongodb");
const Apple = require("./models/Apple");
const User = require("./models/User");
const Origin = require("./models/Origin");
const AppleProfile = require("./models/AppleProfile");
const PhysicalAttributes = require("./models/PhysicalAttributes");
const SearchHistory = require("./models/SearchHistory");
require("./config/passport")(passport);
const authRoutes = require("./routes/auth");

const app = express();
app.use(cors());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Use authentication routes
app.use("/api/auth", authRoutes);

// Serve images from the PMP folder
app.use('/images', express.static(path.join(__dirname, '../public/PMP')));

// Serve frontend files
app.use(express.static(path.join(__dirname, '../Frontend/public')));

// Session and Passport setup
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

// Multer setup for CSV uploads
const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 5 * 1024 * 1024 }
});

// Multer setup for image uploads (memory storage for GridFS)
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit for images
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// MongoDB connection
let gfs;
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    // Initialize GridFS
    const conn = mongoose.connection;
    gfs = new GridFSBucket(conn.db, { bucketName: 'uploads' });
    console.log("GridFS initialized");
  })
  .catch(err => console.error("MongoDB connection error:", err));

// Google OAuth routes
app.get("/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get("/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  (req, res) => {
    res.redirect("/dashboard.html");
  }
);

function ensureAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect("/LoginPage.html");
}

function ensureReadOnly(req, res, next) {
  if (req.user.role === "read-only") return next();
  res.status(403).send("Access denied");
}

app.get("/dashboard", ensureAuth, ensureReadOnly, (req, res) => {
  res.send(`<h1>Welcome, ${req.user.displayName}</h1><p>You have read-only access.</p>`);
});

// Default route
app.get("/", (req, res) => {
  res.send("Apple Explorer API is live!");
});

// GET apples with filtering
app.get("/apples", async (req, res) => {
  try {
    const {
      cultivarName,
      accession,
      originCountry,
      originProvince,
      originCity,
      genus,
      species,
      pedigree,
      harvestDate
    } = req.query;

    const baseFilter = {};
    if (cultivarName) baseFilter.cultivarName = { $regex: new RegExp(cultivarName, "i") };
    if (accession) baseFilter.accession = accession;
    if (harvestDate) baseFilter.harvestDate = harvestDate;

    const results = await Apple.aggregate([
      { $lookup: { from: "Origin", localField: "originId", foreignField: "_id", as: "origin" } },
      { $lookup: { from: "AppleProfile", localField: "appleProfileId", foreignField: "_id", as: "profile" } },
      { $unwind: { path: "$origin", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$profile", preserveNullAndEmptyArrays: true } },
      {
        $match: {
          ...baseFilter,
          ...(originCountry && { "origin.country": { $regex: new RegExp(originCountry, "i") } }),
          ...(originProvince && { "origin.province": { $regex: new RegExp(originProvince, "i") } }),
          ...(originCity && { "origin.city": { $regex: new RegExp(originCity, "i") } }),
          ...(genus && { "profile.genus": { $regex: new RegExp(genus, "i") } }),
          ...(species && { "profile.species": { $regex: new RegExp(species, "i") } }),
          ...(pedigree && { "profile.pedigree": { $regex: new RegExp(pedigree, "i") } })
        }
      },
      {
        $project: {
          _id: 1,
          acno: 1,
          accession: 1,
          cultivarName: 1,
          harvestDate: 1,
          tasteNotes: 1,
          notes: 1,
          createdAt: 1,
          updatedAt: 1,
          appleProfileId: 1,
          physicalAttributesId: 1,
          originId: 1,
          imageId: 1,  // Include imageId field
          origin: 1,
          profile: 1
        }
      }
    ]);

    res.json(results);
  } catch (err) {
    console.error("Error fetching filtered apples:", err);
    res.status(500).json({ error: "Failed to fetch filtered apples" });
  }
});

// POST a single apple
app.post("/apples", async (req, res) => {
  try {
    const {
      accession,
      cultivarName,
      harvestDate,
      tasteNotes,
      notes,
      appleProfileId,
      physicalAttributesId,
      originId,
      imageId
    } = req.body;

    if (!accession || !cultivarName || !originId) {
      return res.status(400).json({ error: "Missing required fields: accession, cultivarName, or originId" });
    }

    const duplicate = await Apple.findOne({
      $or: [{ accession }, { cultivarName }]
    });

    if (duplicate) {
      return res.status(409).json({ error: "Duplicate accession or cultivarName" });
    }

    const newApple = new Apple({
      accession: accession.trim(),
      cultivarName: cultivarName.trim(),
      harvestDate: harvestDate?.trim(),
      tasteNotes: tasteNotes?.trim(),
      notes: notes?.trim(),
      appleProfileId,
      physicalAttributesId,
      originId,
      imageId
    });

    await newApple.save();
    res.status(201).json({ message: "Apple added successfully", data: newApple });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add apple" });
  }
});

// UPDATE an existing apple by ID
app.put("/apples/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await Apple.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true
    });

    if (!updated) {
      return res.status(404).json({ error: "Apple not found" });
    }

    res.json({ message: "Apple updated successfully", data: updated });
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ error: "Failed to update apple" });
  }
});

// DELETE an existing apple by ID
app.delete("/apples/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Apple.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ error: "Apple not found" });
    }

    res.json({ message: "Apple deleted successfully", data: deleted });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ error: "Failed to delete apple" });
  }
});

// Upload CSV and import apples
app.post("/apples/upload", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const results = [], errors = [];
  const filePath = path.join(__dirname, req.file.path);

  fs.createReadStream(filePath)
    .pipe(csv())
    .on("data", (row) => {
      const isValid = row.accession && row.cultivarName && row.originId &&
                      row.accession.trim() !== "" && row.cultivarName.trim() !== "" && row.originId.trim() !== "";

      if (!isValid) {
        errors.push({ row, error: "Missing required fields" });
        return;
      }

      results.push({
        accession: row.accession.trim(),
        cultivarName: row.cultivarName.trim(),
        harvestDate: row.harvestDate?.trim() || null,
        tasteNotes: row.tasteNotes?.trim() || null,
        notes: row.notes?.trim() || null,
        appleProfileId: row.appleProfileId || null,
        physicalAttributesId: row.physicalAttributesId || null,
        originId: row.originId.trim()
      });
    })
    .on("end", async () => {
      const inserted = [];

      for (const data of results) {
        const duplicate = await Apple.findOne({
          $or: [{ accession: data.accession }, { cultivarName: data.cultivarName }]
        });

        if (!duplicate) {
          try {
            const newApple = new Apple(data);
            await newApple.save();
            inserted.push(newApple);
          } catch (err) {
            errors.push({ row: data, error: "MongoDB error" });
          }
        } else {
          errors.push({ row: data, error: "Duplicate accession or cultivarName" });
        }
      }

      fs.unlinkSync(filePath);

      if (errors.length > 0) {
        const logsDir = path.join(__dirname, "logs");
        if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir);

        fs.writeFileSync(path.join(logsDir, "upload_errors.json"), JSON.stringify(errors, null, 2));
        const errorFields = ["row.accession", "row.cultivarName", "error"];
        const errorParser = new Parser({ fields: errorFields, flatten: true });
        fs.writeFileSync(path.join(logsDir, "upload_errors.csv"), errorParser.parse(errors));
      }

      res.json({ message: "CSV processed", insertedCount: inserted.length, skippedCount: errors.length, errors });
    });
});

// Download error logs
app.get("/apples/upload/errors", (req, res) => {
  const errorFile = "logs/upload_errors.csv";
  if (!fs.existsSync(errorFile)) return res.status(404).json({ error: "No error log found" });
  res.download(errorFile, "upload_errors.csv");
});

// Export filtered apples as CSV with pagination and sorting
app.get("/apples/export", async (req, res) => {
  try {
    const {
      cultivarName, accession, originCountry, originProvince, originCity,
      genus, species, pedigree, harvestDate, sortBy = "cultivarName",
      order = "asc", page = 1, limit = 10
    } = req.query;

    const baseFilter = {};
    if (cultivarName) baseFilter.cultivarName = { $regex: new RegExp(cultivarName, "i") };
    if (accession) baseFilter.accession = accession;
    if (harvestDate) baseFilter.harvestDate = harvestDate;

    const apples = await Apple.aggregate([
      { $lookup: { from: "Origin", localField: "originId", foreignField: "_id", as: "origin" } },
      { $lookup: { from: "AppleProfile", localField: "appleProfileId", foreignField: "_id", as: "profile" } },
      { $unwind: { path: "$origin", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$profile", preserveNullAndEmptyArrays: true } },
      {
        $match: {
          ...baseFilter,
          ...(originCountry && { "origin.country": { $regex: new RegExp(originCountry, "i") } }),
          ...(originProvince && { "origin.province": { $regex: new RegExp(originProvince, "i") } }),
          ...(originCity && { "origin.city": { $regex: new RegExp(originCity, "i") } }),
          ...(genus && { "profile.genus": { $regex: new RegExp(genus, "i") } }),
          ...(species && { "profile.species": { $regex: new RegExp(species, "i") } }),
          ...(pedigree && { "profile.pedigree": { $regex: new RegExp(pedigree, "i") } })
        }
      },
      { $sort: { [sortBy]: order === "desc" ? -1 : 1 } },
      { $skip: (parseInt(page) - 1) * parseInt(limit) },
      { $limit: parseInt(limit) }
    ]);

    if (!apples.length) return res.status(404).json({ error: "No apples found to export" });

    const fields = [
      "accession", "cultivarName", "harvestDate", "tasteNotes", "notes",
      "appleProfileId", "physicalAttributesId", "originId"
    ];

    const csv = new Parser({ fields }).parse(apples);
    res.header("Content-Type", "text/csv");
    res.attachment("filtered_apple_data.csv");
    res.send(csv);
  } catch (err) {
    console.error("Export error:", err);
    res.status(500).json({ error: "Failed to export apples" });
  }
});


// API to get unique filter values for search.html dropdowns
app.get("/apples/filters", async (req, res) => {
  try {
    const species = await Apple.distinct("profile.species");
    const cultivarNames = await Apple.distinct("cultivarName");
    const originCountries = await Apple.distinct("origin.country");
    const originProvinces = await Apple.distinct("origin.province");
    const originCities = await Apple.distinct("origin.city");
    res.json({
      species: species.filter(Boolean),
      cultivarNames: cultivarNames.filter(Boolean),
      originCountries: originCountries.filter(Boolean),
      originProvinces: originProvinces.filter(Boolean),
      originCities: originCities.filter(Boolean)
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch filter values" });
  }
});

// POST endpoint for origins
app.post("/origins", async (req, res) => {
  try {
    const { country, province, city } = req.body;
    
    // Check if this origin already exists
    const existingOrigin = await Origin.findOne({
      country: country,
      province: province,
      city: city
    });
    
    if (existingOrigin) {
      return res.status(200).json({ message: "Origin already exists", data: existingOrigin });
    }
    
    const newOrigin = new Origin({
      country: country || null,
      province: province || null,
      city: city || null
    });
    
    await newOrigin.save();
    res.status(201).json({ message: "Origin created successfully", data: newOrigin });
    
  } catch (err) {
    console.error("Error creating origin:", err);
    res.status(500).json({ error: "Failed to create origin" });
  }
});

// POST endpoint for apple profiles
app.post("/apple-profiles", async (req, res) => {
  try {
    const { genus, species, pedigree } = req.body;
    
    if (!genus || !species) {
      return res.status(400).json({ error: "Genus and species are required" });
    }
    
    // Check if this profile already exists
    const existingProfile = await AppleProfile.findOne({
      genus: genus,
      species: species,
      pedigree: pedigree
    });
    
    if (existingProfile) {
      return res.status(200).json({ message: "Profile already exists", data: existingProfile });
    }
    
    const newProfile = new AppleProfile({
      genus: genus.trim(),
      species: species.trim(),
      pedigree: pedigree?.trim() || null
    });
    
    await newProfile.save();
    res.status(201).json({ message: "Apple profile created successfully", data: newProfile });
    
  } catch (err) {
    console.error("Error creating apple profile:", err);
    res.status(500).json({ error: "Failed to create apple profile" });
  }
});

// POST endpoint for physical attributes
app.post("/physical-attributes", async (req, res) => {
  try {
    const { fruitSize, fruitColor, fruitWeight, fruitTexture } = req.body;
    
    const newPhysicalAttributes = new PhysicalAttributes({
      fruitSize: fruitSize || null,
      fruitColor: fruitColor || null,
      fruitWeight: fruitWeight || null,
      fruitTexture: fruitTexture || null
    });
    
    await newPhysicalAttributes.save();
    res.status(201).json({ message: "Physical attributes created successfully", data: newPhysicalAttributes });
    
  } catch (err) {
    console.error("Error creating physical attributes:", err);
    res.status(500).json({ error: "Failed to create physical attributes" });
  }
});

// Image upload endpoint
app.post("/upload-image", imageUpload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }

    if (!gfs) {
      return res.status(500).json({ error: "GridFS not initialized" });
    }

    const { originalname, mimetype, buffer } = req.file;
    
    // Create a unique filename
    const filename = `${Date.now()}_${originalname}`;
    
    // Create a GridFS upload stream
    const uploadStream = gfs.openUploadStream(filename, {
      metadata: {
        originalName: originalname,
        mimetype: mimetype,
        uploadDate: new Date()
      }
    });

    // Handle upload completion
    uploadStream.on('finish', () => {
      res.json({
        success: true,
        imageId: uploadStream.id,
        filename: filename,
        originalName: originalname
      });
    });

    // Handle upload errors
    uploadStream.on('error', (error) => {
      console.error('GridFS upload error:', error);
      res.status(500).json({ error: "Failed to upload image" });
    });

    // Upload the image
    uploadStream.end(buffer);

  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({ error: "Failed to upload image" });
  }
});

// Image retrieval endpoint
app.get("/image/:imageId", async (req, res) => {
  try {
    const { imageId } = req.params;

    if (!gfs) {
      return res.status(500).json({ error: "GridFS not initialized" });
    }

    // Convert string ID to ObjectId
    const objectId = new mongoose.Types.ObjectId(imageId);

    // Get file info first
    const files = await gfs.find({ _id: objectId }).toArray();
    
    if (!files || files.length === 0) {
      return res.status(404).json({ error: "Image not found" });
    }

    const file = files[0];

    // Set appropriate headers
    res.set({
      'Content-Type': file.metadata?.mimetype || 'image/jpeg',
      'Content-Length': file.length,
      'Cache-Control': 'public, max-age=86400' // Cache for 24 hours
    });

    // Create download stream and pipe to response
    const downloadStream = gfs.openDownloadStream(objectId);
    
    downloadStream.on('error', (error) => {
      console.error('GridFS download error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to retrieve image" });
      }
    });

    downloadStream.pipe(res);

  } catch (error) {
    console.error('Image retrieval error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to retrieve image" });
    }
  }
});

// Image deletion endpoint
app.delete("/image/:imageId", async (req, res) => {
  try {
    const { imageId } = req.params;

    if (!gfs) {
      return res.status(500).json({ error: "GridFS not initialized" });
    }

    const objectId = new mongoose.Types.ObjectId(imageId);
    
    await gfs.delete(objectId);
    res.json({ success: true, message: "Image deleted successfully" });

  } catch (error) {
    console.error('Image deletion error:', error);
    res.status(500).json({ error: "Failed to delete image" });
  }
});

// User Management Endpoints

// GET all users
app.get("/users", async (req, res) => {
  try {
    const users = await User.find({}, {
      password: 0, // Exclude password from response
      verificationCode: 0,
      resetPasswordToken: 0
    }).sort({ createdAt: -1 });
    
    // Map users to format expected by frontend
    const formattedUsers = users.map(user => ({
      id: user._id,
      name: user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      role: user.role,
      email: user.email,
      department: user.department || 'Not specified',
      organization: user.organization || 'Not specified',
      jobTitle: user.jobTitle || 'Not specified',
      isVerified: user.isVerified,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      permissions: {
        create: user.role === 'Administrator' || user.role === 'Researcher',
        upload: user.role === 'Administrator' || user.role === 'Researcher',
        update: user.role === 'Administrator',
        admin: user.role === 'Administrator'
      }
    }));
    
    res.json(formattedUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// GET single user
app.get("/users/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id, {
      password: 0,
      verificationCode: 0,
      resetPasswordToken: 0
    });
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    const formattedUser = {
      id: user._id,
      name: user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      role: user.role,
      email: user.email,
      department: user.department || 'Not specified',
      organization: user.organization || 'Not specified',
      jobTitle: user.jobTitle || 'Not specified',
      isVerified: user.isVerified,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      permissions: {
        create: user.role === 'Administrator' || user.role === 'Researcher',
        upload: user.role === 'Administrator' || user.role === 'Researcher',
        update: user.role === 'Administrator',
        admin: user.role === 'Administrator'
      }
    };
    
    res.json(formattedUser);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// POST create new user
app.post("/users", async (req, res) => {
  try {
    const { fullName, email, role, department, organization, jobTitle, password } = req.body;
    
    if (!fullName || !email || !role) {
      return res.status(400).json({ error: "Full name, email, and role are required" });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: "A user with this email already exists" });
    }
    
    const newUser = new User({
      fullName,
      email: email.toLowerCase(),
      role,
      password: password || 'TempPassword123!', // Default temporary password
      department,
      organization,
      jobTitle,
      isVerified: true // Auto-verify admin-created users
    });
    
    await newUser.save();
    
    // Return user without sensitive data
    const formattedUser = {
      id: newUser._id,
      name: newUser.fullName,
      role: newUser.role,
      email: newUser.email,
      department: newUser.department || 'Not specified',
      organization: newUser.organization || 'Not specified',
      jobTitle: newUser.jobTitle || 'Not specified',
      isVerified: newUser.isVerified,
      lastLogin: newUser.lastLogin,
      createdAt: newUser.createdAt,
      permissions: {
        create: newUser.role === 'Administrator' || newUser.role === 'Researcher',
        upload: newUser.role === 'Administrator' || newUser.role === 'Researcher',
        update: newUser.role === 'Administrator',
        admin: newUser.role === 'Administrator'
      }
    };
    
    res.status(201).json(formattedUser);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: "Failed to create user" });
  }
});

// PUT update user
app.put("/users/:id", async (req, res) => {
  try {
    const { role, fullName, department, organization, jobTitle } = req.body;
    
    const updateData = {};
    if (role) updateData.role = role;
    if (fullName) updateData.fullName = fullName;
    if (department) updateData.department = department;
    if (organization) updateData.organization = organization;
    if (jobTitle) updateData.jobTitle = jobTitle;
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password -verificationCode -resetPasswordToken');
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    const formattedUser = {
      id: user._id,
      name: user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      role: user.role,
      email: user.email,
      department: user.department || 'Not specified',
      organization: user.organization || 'Not specified',
      jobTitle: user.jobTitle || 'Not specified',
      isVerified: user.isVerified,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      permissions: {
        create: user.role === 'Administrator' || user.role === 'Researcher',
        upload: user.role === 'Administrator' || user.role === 'Researcher',
        update: user.role === 'Administrator',
        admin: user.role === 'Administrator'
      }
    };
    
    res.json(formattedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: "Failed to update user" });
  }
});

// DELETE user
app.delete("/users/:id", async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    res.json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

// Search History Endpoints

// POST log search
app.post("/api/search-history", async (req, res) => {
  try {
    const { userId, userName, searchQuery, filters, resultsCount, ipAddress, userAgent } = req.body;
    
    if (!userId || !userName || !searchQuery || resultsCount === undefined) {
      return res.status(400).json({ error: "Required fields: userId, userName, searchQuery, resultsCount" });
    }
    
    const searchLog = new SearchHistory({
      userId,
      userName,
      searchQuery,
      filters: filters || {},
      resultsCount,
      ipAddress,
      userAgent
    });
    
    await searchLog.save();
    res.status(201).json({ success: true, message: "Search logged successfully" });
  } catch (error) {
    console.error('Error logging search:', error);
    res.status(500).json({ error: "Failed to log search" });
  }
});

// GET search history
app.get("/api/search-history", async (req, res) => {
  try {
    const { limit = 50, userId } = req.query;
    
    let query = {};
    if (userId) {
      query.userId = userId;
    }
    
    const searchHistory = await SearchHistory.find(query)
      .populate('userId', 'fullName email')
      .sort({ searchDate: -1 })
      .limit(parseInt(limit));
    
    // Format the response
    const formattedHistory = searchHistory.map(search => ({
      id: search._id,
      query: search.searchQuery,
      user: search.userName,
      userId: search.userId._id,
      userEmail: search.userId.email,
      timestamp: search.searchDate.toISOString(),
      results: search.resultsCount,
      filters: search.filters,
      searchDate: search.searchDate
    }));
    
    res.json(formattedHistory);
  } catch (error) {
    console.error('Error fetching search history:', error);
    res.status(500).json({ error: "Failed to fetch search history" });
  }
});

// GET search statistics
app.get("/api/search-stats", async (req, res) => {
  try {
    const totalSearches = await SearchHistory.countDocuments();
    const uniqueUsers = await SearchHistory.distinct('userId').then(users => users.length);
    const averageResults = await SearchHistory.aggregate([
      { $group: { _id: null, avgResults: { $avg: "$resultsCount" } } }
    ]);
    
    const topQueries = await SearchHistory.aggregate([
      { $group: { _id: "$searchQuery", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    res.json({
      totalSearches,
      uniqueUsers,
      averageResults: averageResults[0]?.avgResults || 0,
      topQueries
    });
  } catch (error) {
    console.error('Error fetching search stats:', error);
    res.status(500).json({ error: "Failed to fetch search statistics" });
  }
});


// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});

