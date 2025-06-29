module.exports = {
  routes: [
    {
      method: 'PUT',
      path: '/users/me',
      handler: 'user.updateMe',
      config: {
        policies: [],
        auth: true, // requires user to be logged in
      },
    },
    {
      method: 'DELETE',
      path: '/users/me',
      handler: 'user.deleteMe',
      config: {
        policies: [],
        auth: true, // requires user to be logged in
      },
    },
  ],
};
