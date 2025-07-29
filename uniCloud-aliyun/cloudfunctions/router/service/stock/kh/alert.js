'use strict';
module.exports = {
  /**
   * 股票预警管理
   * @url stock/kh/alert 前端调用的url参数地址
   * @description 股票预警相关操作
   * @param {Object} data 请求参数
   * @param {String} data.action 操作类型：list|add|update|delete
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
          res = await addAlert(event);
          break;
        case 'update':
          res = await updateAlert(event);
          break;
        case 'delete':
          res = await deleteAlert(event);
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
 * 获取预警列表
 */
async function getList(event) {
  let { data = {}, userInfo, util } = event;
  let { vk } = util;
  let { uid } = data;
  let res = { code: 0, msg: '', data: [] };

  try {
    let alertList = await vk.baseDao.select({
      dbName: "stock_alert",
      whereJson: { uid },
      sortArr: [{ name: "create_time", type: "desc" }]
    });

    res.data = alertList.rows;
    res.msg = '获取成功';
  } catch (err) {
    res.code = -1;
    res.msg = err.message || '获取失败';
  }

  return res;
}

/**
 * 添加预警
 */
async function addAlert(event) {
  let { data = {}, userInfo, util } = event;
  let { vk } = util;
  let { uid } = data;
  let res = { code: 0, msg: '' };

  try {
    let { stock_code, stock_name, alert_type, condition, target_value } = data;
    
    if (!stock_code || !stock_name || !alert_type || !condition || target_value === undefined) {
      return { code: -1, msg: '参数不能为空' };
    }

    // 添加预警
    await vk.baseDao.add({
      dbName: "stock_alert",
      dataJson: {
        uid,
        stock_code,
        stock_name,
        alert_type,
        condition,
        target_value: parseFloat(target_value),
        is_active: true,
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
 * 更新预警
 */
async function updateAlert(event) {
  let { data = {}, userInfo, util } = event;
  let { vk } = util;
  let { uid } = data;
  let res = { code: 0, msg: '' };

  try {
    let { _id, alert_type, condition, target_value, is_active } = data;
    
    if (!_id) {
      return { code: -1, msg: '记录ID不能为空' };
    }

    let updateData = { update_time: new Date() };
    
    if (alert_type) updateData.alert_type = alert_type;
    if (condition) updateData.condition = condition;
    if (target_value !== undefined) updateData.target_value = parseFloat(target_value);
    if (is_active !== undefined) updateData.is_active = is_active;

    await vk.baseDao.update({
      dbName: "stock_alert",
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
 * 删除预警
 */
async function deleteAlert(event) {
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
      dbName: "stock_alert",
      whereJson: { _id, uid }
    });

    res.msg = '删除成功';
  } catch (err) {
    res.code = -1;
    res.msg = err.message || '删除失败';
  }

  return res;
}