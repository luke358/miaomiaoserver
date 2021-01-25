var { Email, Head } = require("../untils/config.js");
var UserModel = require("../models/users.js");
var url = require("url");
var fs = require("fs");
var { setCrypto, createVerify } = require("../untils/base.js");

var login = async (req, res, next) => {
  var { username, password, verifyImg } = req.body;

  if (verifyImg !== req.session.verifyImg) {
    res.send({
      msg: "验证码输入错误",
      status: -3
    });
  }
  var result = await UserModel.findLogin({
    username,
    password: setCrypto(password)
  });

  if (result) {
    req.session.username = username;
    req.session.isAdmin = result.isAdmin;
    req.session.userHead = result.userHead;

    if (result.isFreeze) {
      res.send({
        msg: "账号已冻结",
        status: -2
      });
    }
    res.send({
      msg: "登陆成功",
      status: 0
    });
  } else {
    res.send({
      msg: "登陆失败",
      status: -1
    });
  }
};

var register = async (req, res, next) => {
  var { username, password, email, verify } = req.body;

  if (email !== req.session.email || verify !== req.session.verify) {
    res.send({
      msg: "验证码错误",
      status: -1
    });
  }

  if ((Email.time - req.session.time) / 1000 > 300) {
    res.send({
      msg: "验证码已失效",
      status: -3
    });
    return;
  }

  var result = await UserModel.save({
    username,
    password: setCrypto(password),
    email
  });

  if (result) {
    res.send({
      msg: "注册成功",
      status: 0
    });
  } else {
    res.send({
      msg: "注册失败",
      status: -2
    });
  }
};

var verify = async (req, res, next) => {
  var email = req.query.email;
  var verify = Email.verify;

  req.session.verify = verify;
  req.session.email = email;
  req.session.time = Email.time;

  let info = await Email.transporter.sendMail(
    {
      from: "mymovie 1494135711@qq.com",
      to: email, // list of receivers
      subject: "mymovie邮箱验证码", // Subject line
      text: "验证码:" + verify // plain text body
    },
    err => {
      if (err) {
        res.send({
          msg: "验证码发送失败",
          status: -1
        });
      } else {
        res.send({
          msg: "验证码发送成功",
          status: 0
        });
      }
    }
  );
};

var logout = async (req, res, next) => {
  req.session.username = "";
  res.send({
    msg: "退出成功",
    status: 0
  });
};

var getUser = async (req, res, next) => {
  if (req.session.username) {
    res.send({
      msg: "获取用户信息成功",
      status: 0,
      data: {
        username: req.session.username,
        isAdmin: req.session.isAdmin,
        userHead: req.session.userHead
      }
    });
  } else {
    res.send({
      msg: "获取用户信息失败",
      status: -1
    });
  }
};

var findPassword = async (req, res, next) => {
  var { email, password, verify } = req.body;
  if (email === req.session.email && verify === req.session.verify) {
    var result = await UserModel.updatePassword(email, setCrypto(password));
    if (result) {
      res.send({
        msg: "修改密码成功",
        status: 0
      });
    } else {
      res.send({
        msg: "修改密码失败",
        status: -1
      });
    }
  } else {
    res.send({
      msg: "验证码或邮箱错误",
      status: -1
    });
  }
};

var verifyImg = async (req, res) => {
  var result = await createVerify(req, res);
  if (result) {
    res.send(result);
  }
};

var uploadUserHead = async (req, res, next) => {
  //console.log(req.file);
  await fs.rename(
    "public/uploads/" + req.file.filename,
    "public/uploads/" + req.session.username + ".jpg",
    function(err) {
      if (err) {
        throw err;
      }
      var result = UserModel.updateUserHead(
        req.session.username,
        url.resolve(Head.baseUrl, req.session.username + ".jpg")
      );

      if (result) {
        res.send({
          msg: "头像修改成功",
          status: 0,
          data: {
            userHead: url.resolve(Head.baseUrl, req.session.username + ".jpg")
          }
        });
      } else {
        res.send({
          msg: "头像修改失败",
          status: -1
        });
      }
    }
  );
};

module.exports = {
  login,
  register,
  verify,
  logout,
  getUser,
  findPassword,
  verifyImg,
  uploadUserHead
};