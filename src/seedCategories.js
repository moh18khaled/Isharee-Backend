const Category = require('./models/category'); // Make sure to adjust the path to your Category model

const seedCategories = async () => {
    // Remove all categories if any exist
    await Category.deleteMany({});

    // Create new categories
    const categories = [
      { name: 'Technology' },
      { name: 'Web Development' },
    ];
    await Category.insertMany(categories);

console.log("done");
};
module.exports = seedCategories;
