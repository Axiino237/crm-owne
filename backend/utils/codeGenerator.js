const { Op } = require('sequelize');

/**
 * Generates a unique uppercase code from a name.
 * Handles collisions by appending a counter.
 * 
 * @param {Object} model - The Sequelize model to check uniqueness against
 * @param {string} name - The name to generate code from
 * @param {string} field - The code field name (default 'code')
 * @param {Object} scope - Additional where conditions for uniqueness check (e.g. { organizationId })
 */
const generateUniqueCode = async (model, name, field = 'code', scope = {}) => {
  if (!name) return 'CODE';
  
  // Convert to upper case, remove special characters and spaces
  let baseCode = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8); // Limit base code to 8 chars

  if (!baseCode) {
    baseCode = 'CODE';
  }

  let code = baseCode;
  let counter = 1;
  
  while (true) {
    const whereClause = { [field]: code, ...scope };
    const exists = await model.findOne({ where: whereClause });
    if (!exists) {
      break;
    }
    code = `${baseCode}${counter}`;
    counter++;
  }

  return code;
};

module.exports = { generateUniqueCode };
