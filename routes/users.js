import express from "express";
import {check, validationResult} from "express-validator";
import passport from "passport";
import {calcHash, generateSalt} from "../util/auth.js";
import {PrismaClient} from "@prisma/client";

const router = express.Router();
const prisma = new PrismaClient();

/**
 * ログイン状態チェック
 */
router.get("/", (req, res, next) => {
  if (!req.user) {
    // 未ログインなら、Error オブジェクトを作って、ステータスを設定してスロー
    const err = new Error("unauthenticated");
    err.status = 401;
    throw err;
  }
  // ここに来れるなら、ログイン済み。
  res.json({
    message: "logged in"
  });
});

router.get("/check", (req, res, next) => {
  if (!req.user) {
    // 未ログインの場合
    res.status(401).json({
      result: "NG"
    });
  } else {
    // ログイン済みの場合
    res.status(200).json({
      result: "OK",
      isAdmin: req.user.isAdmin || false
    });
  }
});

/**
 * ユーザ認証
 */
router.post("/login", passport.authenticate("local", {
  failWithError: true // passport によるログインに失敗したらエラーを発生させる
}), (req, res, next) => {
  // ここに来れるなら、ログインは成功していることになる。
  res.json({
    message: "OK"
  });
});
/**
 * ユーザ新規作成
 */
router.post("/register", [
  // 入力値チェックミドルウェア
  check("name").notEmpty({ignore_whitespace: true}),
  check("email").notEmpty({ignore_whitespace: true}),
  check("password").notEmpty({ignore_whitespace: true})
], async (req, res, next) => {
  if (!validationResult(req).isEmpty()) {
    res.status(400).json({
      message: "username and/or password is empty"
    });
    return;
  }
  const {name, email, password} = req.body;
  const salt = generateSalt();
  const hashed = calcHash(password, salt);
  try {
    await prisma.user.create({
      data: {
        name,
        email,
        password: hashed,
        salt
      }
    });
    res.status(201).json({
      message: "created!"
    });
  } catch (e) {
    // データベース側で何らかのエラーが発生したときにここへ来る。
    switch (e.code) {
      case "P2002":
        // このエラーコードは、データベースの制約違反エラーっぽい。
        // おそらくUnique制約が設定されている name なので
        // すでに登録されている名前と同じ名前のユーザを登録しようとした。
        res.status(400).json({
          message: "username is already registered"
        });
        break;
      default:
        // その他のエラー全てに対応できないので
        // 詳細をコンソールに吐き出して、クライアントにはエラーのことだけ伝える。
        console.error(e);
        res.status(500).json({
          message: "unknown error"
        });
    }
  }
});

// ログアウトエンドポイント
router.get("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.json({
      result: "OK"
    });
  });
});


export default router;