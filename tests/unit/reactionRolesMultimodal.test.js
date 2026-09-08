import { describe, it } from 'node:test';
import assert from 'node:assert';
import messageReactionAdd from '../../src/events/messageReactionAdd.js';
import messageReactionRemove from '../../src/events/messageReactionRemove.js';
import { createReactionRoleMessage, getReactionRoleMessage } from '../../src/services/reactionRoleService.js';

describe('Multimodal Reaction Roles (Enfoque 1)', () => {
  it('creates and persists reaction role data with type, rolesMap, and roles list', async () => {
    const memoryDb = new Map();
    const mockClient = {
      db: {
        set: async (key, val) => memoryDb.set(key, val),
        get: async (key) => memoryDb.get(key) || null,
        delete: async (key) => memoryDb.delete(key),
      },
      guilds: {
        cache: {
          get: (id) => ({
            id,
            roles: {
              cache: {
                get: (roleId) => ({
                  id: roleId,
                  name: 'Test Role',
                  position: 1,
                  permissions: { has: () => false },
                }),
              },
            },
            members: {
              me: { roles: { highest: { position: 10 } } },
            },
          }),
        },
      },
    };

    const guildId = '123456789012345678';
    const channelId = '234567890123456789';
    const messageId = '345678901234567890';
    const roleId = '456789012345678901';

    const saved = await createReactionRoleMessage(
      mockClient,
      guildId,
      channelId,
      messageId,
      [roleId],
      {
        type: 'reactions',
        title: 'Roles de Prueba',
        description: 'Elige tu rol',
        rolesMap: { '⭐': roleId },
        roles: [{ roleId, emoji: '⭐', name: 'Test Role' }],
      }
    );

    assert.strictEqual(saved.guildId, guildId);
    assert.strictEqual(saved.type, 'reactions');
    assert.strictEqual(saved.rolesMap['⭐'], roleId);

    const retrieved = await getReactionRoleMessage(mockClient, guildId, messageId);
    assert.ok(retrieved);
    assert.strictEqual(retrieved.type, 'reactions');
    assert.strictEqual(retrieved.rolesMap['⭐'], roleId);
  });

  it('messageReactionAdd adds role when user reacts with registered emoji', async () => {
    const memoryDb = new Map();
    const guildId = '123456789012345678';
    const messageId = '345678901234567890';
    const roleId = '456789012345678901';
    const userId = '567890123456789012';

    let addedRoleId = null;
    const mockMember = {
      id: userId,
      roles: {
        cache: {
          has: (id) => id === addedRoleId,
        },
        add: async (id) => {
          addedRoleId = id;
        },
      },
    };

    const mockRole = {
      id: roleId,
      name: 'Gamer',
      position: 2,
    };

    const mockGuild = {
      id: guildId,
      members: {
        me: {
          roles: { highest: { position: 10 } },
          permissions: { has: () => true },
        },
        fetch: async () => mockMember,
      },
      roles: {
        cache: {
          get: (id) => (id === roleId ? mockRole : null),
        },
      },
    };

    const mockClient = {
      db: {
        get: async (key) => memoryDb.get(key) || null,
      },
    };

    memoryDb.set(`guild:${guildId}:reaction_roles:${messageId}`, {
      guildId,
      messageId,
      type: 'reactions',
      rolesMap: { '🎮': roleId },
    });

    const mockReaction = {
      partial: false,
      message: { id: messageId, guild: mockGuild },
      emoji: { name: '🎮', id: null },
    };
    const mockUser = {
      id: userId,
      bot: false,
      tag: 'TestUser#0001',
    };

    await messageReactionAdd.execute(mockReaction, mockUser, mockClient);

    assert.strictEqual(addedRoleId, roleId);
  });

  it('messageReactionRemove removes role when user un-reacts', async () => {
    const memoryDb = new Map();
    const guildId = '123456789012345678';
    const messageId = '345678901234567890';
    const roleId = '456789012345678901';
    const userId = '567890123456789012';

    let removedRoleId = null;
    const mockMember = {
      id: userId,
      roles: {
        cache: {
          has: (id) => id === roleId && removedRoleId !== roleId,
        },
        remove: async (id) => {
          removedRoleId = id;
        },
      },
    };

    const mockRole = {
      id: roleId,
      name: 'Gamer',
      position: 2,
    };

    const mockGuild = {
      id: guildId,
      members: {
        me: {
          roles: { highest: { position: 10 } },
          permissions: { has: () => true },
        },
        fetch: async () => mockMember,
      },
      roles: {
        cache: {
          get: (id) => (id === roleId ? mockRole : null),
        },
      },
    };

    const mockClient = {
      db: {
        get: async (key) => memoryDb.get(key) || null,
      },
    };

    memoryDb.set(`guild:${guildId}:reaction_roles:${messageId}`, {
      guildId,
      messageId,
      type: 'reactions',
      rolesMap: { '🎮': roleId },
    });

    const mockReaction = {
      partial: false,
      message: { id: messageId, guild: mockGuild },
      emoji: { name: '🎮', id: null },
    };
    const mockUser = {
      id: userId,
      bot: false,
      tag: 'TestUser#0001',
    };

    await messageReactionRemove.execute(mockReaction, mockUser, mockClient);

    assert.strictEqual(removedRoleId, roleId);
  });
});
