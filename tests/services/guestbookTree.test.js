/**
 * 留言楼中楼单元测试：buildGuestTree
 */

const databaseRouter = require('../../server/routes/database');
const buildGuestTree = databaseRouter.buildGuestTree;

describe('buildGuestTree', () => {
  test('顶级留言无回复时返回原样', () => {
    const rows = [
      { id: 1, parent_id: null, user_name: '甲', content: '你好' },
      { id: 2, parent_id: null, user_name: '乙', content: '寻亲' }
    ];
    const tree = buildGuestTree(rows);
    expect(tree).toHaveLength(2);
    expect(tree[0].replies).toEqual([]);
    expect(tree[1].replies).toEqual([]);
  });

  test('回复挂到顶级留言的 replies 里', () => {
    const rows = [
      { id: 1, parent_id: null, user_name: '甲', content: '你好' },
      { id: 2, parent_id: 1, user_name: '乙', content: '回复甲' },
      { id: 3, parent_id: 1, user_name: '丙', content: '也回复甲' }
    ];
    const tree = buildGuestTree(rows);
    expect(tree).toHaveLength(1);
    expect(tree[0].replies).toHaveLength(2);
    expect(tree[0].replies[0].content).toBe('回复甲');
    expect(tree[0].replies[1].content).toBe('也回复甲');
  });

  test('回复的回复也挂到同一顶级楼下（只挂一层）', () => {
    const rows = [
      { id: 1, parent_id: null, user_name: '甲', content: '你好' },
      { id: 2, parent_id: 1, user_name: '乙', content: '回复甲' },
      { id: 3, parent_id: 2, user_name: '甲', content: '再回乙' }
    ];
    const tree = buildGuestTree(rows);
    expect(tree).toHaveLength(1);
    expect(tree[0].replies).toHaveLength(2);
    expect(tree[0].replies[1].content).toBe('再回乙');
  });

  test('parent_id 指向不存在的留言时丢弃孤儿回复', () => {
    const rows = [
      { id: 1, parent_id: null, user_name: '甲', content: '你好' },
      { id: 9, parent_id: 999, user_name: '孤儿', content: '找不到爹' }
    ];
    const tree = buildGuestTree(rows);
    expect(tree).toHaveLength(1);
    expect(tree[0].replies).toHaveLength(0);
  });
});
