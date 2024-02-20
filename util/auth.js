import crypto from "node:crypto";
import {Strategy as LocalStrategy} from "passport-local";
import {PrismaClient} from "@prisma/client";

const N = Math.pow(2, 17);
const maxmem = 144 * 1024 * 1024;
const keyLen = 192;
const saltSize = 64;

/**
 * Salt用のランダムバイト列生成
 */
export const generateSalt = () => crypto.randomBytes(saltSize);

/**
 * パスワードハッシュ値計算
 * @param {string} plain
 * @param {Buffer} salt
 */
export const calcHash = (plain, salt) => {
    const normalized = plain.normalize();
    const hash = crypto.scryptSync(normalized, salt, keyLen, { N, maxmem });
    if (!hash) {
        throw Error("ハッシュ値計算エラー");
    }
    return hash;
};

/**
 * Passport.js を設定する
 */
const config = (passport) => {
    const prisma = new PrismaClient();
    passport.use(new LocalStrategy({
        usernameField: "email", passwordField: "password"
    }, async (email, password, done) => { // username を email に変更
        try {
            const user = await prisma.user.findUnique({
                where: {email: email} // ユーザーの検索を email で行う
            });
            if (!user) {
                // ユーザがいない
                return done(null, false, {message: "invalid email and/or password."}); // メッセージを修正
            }
            const hashed = calcHash(password, user.salt);
            if (!crypto.timingSafeEqual(user.password, hashed)) {
                // パスワードが異なる
                return done(null, false, {message: "invalid email and/or password.."}); // メッセージを修正
            }
            // OK
            return done(null, user);
        } catch (e) {
            return done(e);
        }
    }));
    // セッションストアに保存
    passport.serializeUser((user, done) => {
        process.nextTick(() => {
            done(null, { id: user.id, email: user.email });
        });
    });
    // セッションストアから復元
    passport.deserializeUser((user, done) => {
        process.nextTick(() => {
            return done(null, user);
        });
    });
};

export default config;