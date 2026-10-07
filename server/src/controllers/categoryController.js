const mongoose = require("mongoose");
const Category = require("../models/Category");
const Vehicle = require("../models/Vehicle");

function isAdmin(req) {
  return req.user?.role === "admin";
}

async function getCategories(req, res) {
  try {
    const includeInactive = req.query.includeInactive === "true";

    if (includeInactive && !isAdmin(req)) {
      return res.status(403).json({ success: false, message: "Admin access is required.", errors: [] });
    }

    const filter = includeInactive ? {} : { isActive: true };
    const categories = await Category.find(filter).sort({ name: 1 });

    return res.status(200).json({ success: true, message: "Categories loaded.", data: { categories } });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Could not load categories.", errors: [] });
  }
}

async function createCategory(req, res) {
  try {
    const { name, description } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: "Category name is required.", errors: [] });
    }

    const category = await Category.create({ name, description });
    return res.status(201).json({ success: true, message: "Category created.", data: { category } });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: "A category with this name already exists.", errors: [] });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Please check the category details.",
        errors: Object.values(error.errors).map((item) => item.message),
      });
    }

    return res.status(500).json({ success: false, message: "Could not create category.", errors: [] });
  }
}

async function updateCategory(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: "Category ID is invalid.", errors: [] });
  }

  try {
    const updates = {};
    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.description !== undefined) updates.description = req.body.description;
    if (req.body.isActive !== undefined) updates.isActive = req.body.isActive;

    const category = await Category.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found.", errors: [] });
    }

    return res.status(200).json({ success: true, message: "Category updated.", data: { category } });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: "A category with this name already exists.", errors: [] });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Please check the category details.",
        errors: Object.values(error.errors).map((item) => item.message),
      });
    }

    return res.status(500).json({ success: false, message: "Could not update category.", errors: [] });
  }
}

async function deleteCategory(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: "Category ID is invalid.", errors: [] });
  }

  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found.", errors: [] });
    }

    const categoryInUse = await Vehicle.exists({ category: category._id });

    if (categoryInUse) {
      return res.status(409).json({
        success: false,
        message: "This category is assigned to vehicles. Deactivate it instead of deleting it.",
        errors: [],
      });
    }

    await category.deleteOne();
    return res.status(200).json({ success: true, message: "Category deleted.", data: {} });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Could not delete category.", errors: [] });
  }
}

module.exports = { getCategories, createCategory, updateCategory, deleteCategory };
