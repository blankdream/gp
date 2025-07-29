'use strict';
module.exports = {
  /**
   * 股票池管理
   * @url stock/kh/pool 前端调用的url参数地址
   * @description 股票池相关操作
   * @param {Object} data 请求参数
   * @param {String} data.action 操作类型：list|add|update|delete|updateSort
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
          res = await addStock(event);
          break;
        case 'update':
          res = await updateStock(event);
          break;
        case 'delete':
          res = await deleteStock(event);
          break;
        case 'updateSort':
          res = await updateSort(event);
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
 * 获取股票池列表
 */
async function getList(event) {
  let { data = {}, userInfo, util } = event;
  let { vk } = util;
  let { uid } = data;
  let res = { code: 0, msg: '', data: [] };

  try {
    let { group_name } = data;
    let whereJson = { uid };
    
    if (group_name) {
      whereJson.group_name = group_name;
    }

    let stockList = await vk.baseDao.select({
      dbName: "stock_pool",
      whereJson,
      sortArr: [{ name: "sort_order", type: "asc" }]
    });

    res.data = stockList.rows;
    res.msg = '获取成功';
  } catch (err) {
    res.code = -1;
    res.msg = err.message || '获取失败';
  }

  return res;
}

/**
 * 添加股票到股票池
 */
async function addStock(event) {
  let { data = {}, userInfo, util } = event;
  let { vk, db } = util;
  let { uid } = data;
  let res = { code: 0, msg: '' };

  try {
    let { stock_code, stock_name, group_name, remark } = data;
    
    if (!stock_code || !stock_name) {
      return { code: -1, msg: '股票代码和名称不能为空' };
    }

    // 检查是否已存在
    let existStock = await vk.baseDao.select({
      dbName: "stock_pool",
      whereJson: { uid, stock_code },
      pageSize: 1
    });
    
    if (existStock.rows && existStock.rows.length > 0) {
      return { code: -1, msg: '该股票已在股票池中' };
    }

    // 获取最大排序号
    let maxSort = await db.collection("stock_pool")
      .where({ uid })
      .orderBy('sort_order', 'desc')
      .limit(1)
      .get();
    
    let sortOrder = maxSort.data.length > 0 ? maxSort.data[0].sort_order + 1 : 1;

    // 添加股票
    await vk.baseDao.add({
      dbName: "stock_pool",
      dataJson: {
        uid,
        stock_code,
        stock_name,
        group_name: group_name || '',
        remark: remark || '',
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
 * 更新股票信息
 */
async function updateStock(event) {
  let { data = {}, userInfo, util } = event;
  let { vk } = util;
  let { uid } = data;
  let res = { code: 0, msg: '' };

  try {
    let { _id, group_name, remark, sort_order } = data;
    
    if (!_id) {
      return { code: -1, msg: '记录ID不能为空' };
    }

    let updateData = { update_time: new Date() };
    
    if (group_name !== undefined) updateData.group_name = group_name;
    if (remark !== undefined) updateData.remark = remark;
    if (sort_order !== undefined) updateData.sort_order = sort_order;

    await vk.baseDao.update({
      dbName: "stock_pool",
      whereJson: { _id, uid },
      dataJson: updateData
    });

    res.msg = '更新成功';
  } catch (err) {
    res.code = -1;
    res.msg = err.message || '更新失败';
  }

  return res;
}

/**
 * 删除股票
 */
async function deleteStock(event) {
  let { data = {}, userInfo, util } = event;
  let { vk } = util;
  let { uid } = data;
  let res = { code: 0, msg: '' };

  try {
    let { _id } = data;
    
    if (!_id) {
      return { code: -1, msg: '记录ID不能为空' };
    }

    await vk.baseDao.del({
      dbName: "stock_pool",
      whereJson: { _id, uid }
    });

    res.msg = '删除成功';
  } catch (err) {
    res.code = -1;
    res.msg = err.message || '删除失败';
  }

  return res;
}

/**
 * 批量更新排序
 */
async function updateSort(event) {
  let { data = {}, userInfo, util } = event;
  let { vk, db } = util;
  let { uid } = data;
  let res = { code: 0, msg: '' };

  try {
    let { sortList } = data;
    
    if (!sortList || !Array.isArray(sortList)) {
      return { code: -1, msg: '排序数据格式错误' };
    }

    // 批量更新排序
    for (let item of sortList) {
      await vk.baseDao.update({
        dbName: "stock_pool",
        whereJson: { _id: item._id, uid },
        dataJson: { 
          sort_order: item.sort_order,
          update_time: new Date()
        }
      });
    }

    res.msg = '排序更新成功';
  } catch (err) {
    res.code = -1;
    res.msg = err.message || '排序更新失败';
  }

  return res;
}