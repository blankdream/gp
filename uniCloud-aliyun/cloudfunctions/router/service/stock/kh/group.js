'use strict';
module.exports = {
  /**
   * 股票分组管理
   * @url stock/kh/group 前端调用的url参数地址
   * @description 股票分组相关操作
   * @param {Object} data 请求参数
   * @param {String} data.action 操作类型：list|add|delete|reorder
   */
  main: async (event) => {
    let { data = {}, userInfo, util } = event;
    let { vk, db } = util;
    let { uid } = data;
    let res = { code: 0, msg: '' };

    try {
      const { action } = data;
      
      switch (action) {
        case 'list':
          res = await getList(event);
          break;
        case 'add':
          res = await addGroup(event);
          break;
        case 'delete':
          res = await deleteGroup(event);
          break;
        case 'reorder':
          res = await reorderGroup(event);
          break;
        default:
          res = { code: -1, msg: '未指定操作类型' };
      }
    } catch (err) {
      res = { code: -1, msg: err.message || '操作失败' };
    }

    return res;
  }
};

/**
 * 获取分组列表
 */
async function getList(event) {
  let { data = {}, userInfo, util } = event;
  let { vk } = util;
  let { uid } = data;
  let res = { code: 0, msg: '', data: [] };

  try {
    let groupList = await vk.baseDao.select({
      dbName: "stock_group",
      whereJson: { uid },
      sortArr: [{ name: "sort_order", type: "asc" }, { name: "create_time", type: "desc" }]
    });

    res.data = groupList.rows;
    res.msg = '获取成功';
  } catch (err) {
    res.code = -1;
    res.msg = err.message || '获取失败';
  }

  return res;
}

/**
 * 添加分组
 */
async function addGroup(event) {
  let { data = {}, userInfo, util } = event;
  let { vk } = util;
  let { uid } = data;
  let res = { code: 0, msg: '' };

  try {
    let { group_name } = data;
    
    if (!group_name) {
      return { code: -1, msg: '分组名称不能为空' };
    }

    // 检查是否已存在
    let existGroup = await vk.baseDao.select({
      dbName: "stock_group",
      whereJson: { uid, group_name },
      pageSize: 1
    });
    
    if (existGroup.rows && existGroup.rows.length > 0) {
      return { code: -1, msg: '分组已存在' };
    }

    // 获取当前最大排序值
    let maxSort = await vk.baseDao.select({
      dbName: "stock_group",
      whereJson: { uid },
      sortArr: [{ name: "sort_order", type: "desc" }],
      pageSize: 1
    });
    
    let sortOrder = 0;
    if (maxSort.rows && maxSort.rows.length > 0 && maxSort.rows[0].sort_order !== undefined) {
      sortOrder = maxSort.rows[0].sort_order + 1;
    }

    // 添加分组
    await vk.baseDao.add({
      dbName: "stock_group",
      dataJson: {
        uid,
        group_name,
        sort_order: sortOrder,
        create_time: new Date(),
        update_time: new Date()
      }
    });

    res.msg = '添加成功';
  } catch (err) {
    res.code = -1;
    res.msg = err.message || '添加失败';
  }

  return res;
}

/**
 * 删除分组
 */
async function deleteGroup(event) {
  let { data = {}, userInfo, util } = event;
  let { vk } = util;
  let { uid } = data;
  let res = { code: 0, msg: '' };

  try {
    let { _id } = data;
    
    if (!_id) {
      return { code: -1, msg: '记录ID不能为空' };
    }

    // 获取分组信息
    let groupInfo = await vk.baseDao.select({
      dbName: "stock_group",
      whereJson: { _id, uid },
      pageSize: 1
    });

    if (!groupInfo.rows || groupInfo.rows.length === 0) {
      return { code: -1, msg: '分组不存在' };
    }

    const groupName = groupInfo.rows[0].group_name;

    // 删除分组
    await vk.baseDao.del({
      dbName: "stock_group",
      whereJson: { _id, uid }
    });

    // 清空该分组下股票的分组信息
    await vk.baseDao.update({
      dbName: "stock_pool",
      whereJson: { uid, group_name: groupName },
      dataJson: { group_name: '', update_time: new Date() }
    });

    res.msg = '删除成功';
  } catch (err) {
    res.code = -1;
    res.msg = err.message || '删除失败';
  }

  return res;
}

/**
 * 分组重排序
 */
async function reorderGroup(event) {
  let { data = {}, userInfo, util } = event;
  let { vk } = util;
  let { uid } = data;
  let res = { code: 0, msg: '' };

  try {
    let { fromIndex, toIndex } = data;
    
    if (fromIndex === undefined || toIndex === undefined) {
      return { code: -1, msg: '参数不完整' };
    }

    // 获取所有分组
    let groupList = await vk.baseDao.select({
      dbName: "stock_group",
      whereJson: { uid },
      sortArr: [{ name: "sort_order", type: "asc" }, { name: "create_time", type: "desc" }]
    });

    if (!groupList.rows || groupList.rows.length === 0) {
      return { code: -1, msg: '没有分组数据' };
    }

    const groups = groupList.rows;
    
    // 检查索引范围
    if (fromIndex < 0 || fromIndex >= groups.length || toIndex < 0 || toIndex >= groups.length) {
      return { code: -1, msg: '索引超出范围' };
    }

    // 重新排列数组
    const [movedItem] = groups.splice(fromIndex, 1);
    groups.splice(toIndex, 0, movedItem);

    // 更新排序值
    const updatePromises = groups.map((group, index) => {
      return vk.baseDao.update({
        dbName: "stock_group",
        whereJson: { _id: group._id, uid },
        dataJson: { 
          sort_order: index,
          update_time: new Date() 
        }
      });
    });

    await Promise.all(updatePromises);

    res.msg = '排序成功';
  } catch (err) {
    res.code = -1;
    res.msg = err.message || '排序失败';
  }

  return res;
}