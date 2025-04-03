const Category = require('./models/category'); // Make sure to adjust the path to your Category model

const seedCategories = async () => {
    // Remove all categories if any exist
    await Category.deleteMany({});

    // Create new categories
    const categories = [
      { name: 'Dining' },
      { name: 'Healthcare' },
      { name: 'Education' },
      { name: 'Fashion' },
      { name: 'Movies' },
      { name: 'Books' },

    ];
    await Category.insertMany(categories);

console.log("done");
};
module.exports = seedCategories;
