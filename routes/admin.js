import express from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = express.Router();

// 書籍情報登録
router.post("/book/create", async (req, res) => {
    // ログインユーザが管理者でない場合は常に403エラーを返す
    if (!req.user || !req.user.isAdmin) {
        return res.status(403).json({ error: "Forbidden" });
    }

    const { isbn13, title, author, publishDate } = req.body;

    try {
        // 書籍情報をデータベースに登録
        const createdBook = await prisma.books.create({
            data: {
                isbn13: parseFloat(isbn13), // 数値型に変換
                title,
                author,
                publishDate: new Date(publishDate)
            }
        });
        res.status(201).json({ result: "OK", book: createdBook });
    } catch (error) {
        // エラーが発生した場合は400エラーを返す
        res.status(400).json({ result: "NG", error: error.message });
    }
});

// 書籍情報更新
router.put("/book/update", async (req, res) => {
    // ログインユーザが管理者でない場合は常に403エラーを返す
    if (!req.user || !req.user.isAdmin) {
        return res.status(403).json({ error: "Forbidden" });
    }

    const { bookId, isbn13, title, author, publishDate } = req.body;

    try {
        const updatedBook = await prisma.books.update({
            where: { id: bookId },
            data: {
                isbn13: parseFloat(isbn13),
                title,
                author,
                publishDate: new Date(publishDate)
            }
        });
        res.status(200).json({ result: "OK", book: updatedBook });
    } catch (error) {
        res.status(400).json({ result: "NG", error: error.message });
    }
});

// 全ユーザの貸出中書籍一覧
router.get("/rental/current", async (req, res) => {
    // ログインユーザが管理者でない場合は常に403エラーを返す
    if (!req.user || !req.user.isAdmin) {
        return res.status(403).json({ error: "Forbidden" });
    }

    try {
        const rentalBooks = await prisma.rental.findMany({
            include: {
                User: true,
                Book: true
            }
        });
        res.status(200).json({ rentalBooks });
    } catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// 特定ユーザの貸出中書籍一覧
router.get("/rental/current/:uid", async (req, res) => {
    // ログインユーザが管理者でない場合は常に403エラーを返す
    if (!req.user || !req.user.isAdmin) {
        return res.status(403).json({ error: "Forbidden" });
    }

    const userId = parseInt(req.params.uid);

    try {
        const rentalBooks = await prisma.rental.findMany({
            where: { userId },
            include: {
                User: true,
                Book: true
            }
        });
        res.status(200).json({ userId, rentalBooks });
    } catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
    }
});

export default router;