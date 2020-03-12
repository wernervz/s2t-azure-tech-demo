'use strict';

module.exports = function (ApiUser) {

  ApiUser.findUserIdByToken = async function (accessToken, cb) {

    let app = await getApp(ApiUser)

    let AccessToken = app.models.AccessToken
    let accessTokenInst = await AccessToken.findById(accessToken)

    let userInst = await ApiUser.findById(accessTokenInst.userId)

    return userInst
  }

  ApiUser.isInRole = async function (accessToken, roleToCheck, cb) {

    let app = await getApp(ApiUser)
    let RoleMapping = app.models.RoleMapping
    let Role = app.models.Role
    let AccessToken = app.models.AccessToken

    // First find the user based on the Access Token that is passed in

    let accessTokenInst = await AccessToken.findById(accessToken)
    // Once we have the user, now we can find the roles the user belong to by finding all the role mappings
    let roleMappingInst = await RoleMapping.find({ where: { principalId: accessTokenInst.userId }})

    if (roleMappingInst && roleMappingInst.length > 0) {
      let checked = 0
      let isInRole = false
      // Loop over all the roles the user belongs to
      for (let mapping of roleMappingInst) {
        // And find the name of the role, to match against the requested role being checked.
        let roleInst = await Role.findById(mapping.roleId)
        checked++
        if (!isInRole && roleInst.name === roleToCheck) {
          isInRole = true
        }
        if (checked >= roleMappingInst.length) {
          return { isInRole: isInRole }
        }
      }
    } else {
      return { isInRole: false }
    }
  }

  function getApp(model) {
    return new Promise((resolve, reject) => {
      model.getApp((err, app) => {
        if (err) reject(err)
        resolve(app)
      })  
    })
  }
}
