require('dotenv').config();
const { User } = require('./models');
const { generateToken } = require('./middleware/auth');

async function run() {
  const user = await User.findOne({ where: { email: 'vijaydesign@crm.com' } });
  if (!user) {
    console.log('User not found');
    process.exit(1);
  }
  const token = generateToken(user.id);
  console.log('TOKEN:', token);
  process.exit(0);
}
run();
