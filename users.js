// JMC User Accounts
const JMC_USERS = [
  {
    username: 'admin',
    password: 'jmcadmin2024',
    role: 'admin',
    displayName: 'Admin'
  },
  {
    username: 'supervisor1',
    password: 'super1pass',
    role: 'supervisor',
    displayName: 'Supervisor One'
  },
  {
    username: 'supervisor2',
    password: 'super2pass',
    role: 'supervisor',
    displayName: 'Supervisor Two'
  },
  {
    username: 'gjara',
    password: 'JMC2026',
    role: 'admin',
    displayName: 'Giovani Jara'
  }
];

function findUser(username, password) {
  return JMC_USERS.find(
    u => u.username === username && u.password === password
  ) || null;
}
