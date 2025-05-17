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
};
