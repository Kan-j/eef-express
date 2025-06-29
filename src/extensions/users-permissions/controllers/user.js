'use strict';

module.exports = {
  async updateMe(ctx) {
    const userId = ctx.state.user.id; // Authenticated user's ID
    const { firstName, lastName , username } = ctx.request.body;
    const updateData = { firstName, lastName , username };

    const updatedUser = await strapi
      .plugin('users-permissions')
      .service('user')
      .edit(userId, updateData);

    ctx.send({
      message: 'Profile updated successfully',
      user: updatedUser,
    });
  },

  async deleteMe(ctx) {
    try {
      const userId = ctx.state.user.id; // Authenticated user's ID
      console.log(ctx.state.user)

      if (!userId) {
        return ctx.unauthorized('You must be logged in');
      }

      // Delete the user account
      await strapi
        .plugin('users-permissions')
        .service('user')
        .remove({id: userId});

      ctx.send({
        message: 'Account deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting user account:', error);
      ctx.throw(500, error.message || 'An error occurred while deleting the account');
    }
  },
};
