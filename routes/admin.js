import express from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = express.Router();

// エラーハンドリングミドルウェア
const errorHandler = (res, statusCode, message) => {
    return res.status(statusCode).json({ error: message });
};

// 管理者権限チェックミドルウェア
const checkAdminPermission = (req, res, next) => {
    if (!req.user || !req.user.isAdmin) {
        return res.status(403).json({ error: "Forbidden" });
    }
    next();
};


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

// 全ユーザーの貸出中書籍一覧
router.get("/rental/current", checkAdminPermission, async (req, res) => {
    try {
        const allUsers = await prisma.user.findMany();

        const rentalBooksByUser = await Promise.all(allUsers.map(async (user) => {
            const rentalBooks = await prisma.rental.findMany({
                where: { userId: user.id, returnDate: null },
                include: {
                    Book: true
                }
            });

            const formattedRentalBooks = rentalBooks.map(rental => ({
                rentalId: rental.id,
                bookId: rental.Book.id,
                bookName: rental.Book.title,
                rentalDate: rental.rentalDate,
                returnDeadline: rental.returnDeadline
            }));

            if (formattedRentalBooks.length === 0) {
                return null; // rentalBooksが空の場合はnullを返す
            }

            return {
                userId: user.id,
                userName: user.name,
                rentalBooks: formattedRentalBooks
            };
        }));

        // rentalBooksがnullでない要素のみをフィルタリングして返す
        const filteredRentalBooksByUser = rentalBooksByUser.filter(rental => rental !== null);

        res.status(200).json({ rentalBooksByUser: filteredRentalBooksByUser });
    } catch (error) {
        errorHandler(res, 500, "Internal Server Error");
    }
});


// 特定ユーザの貸出中書籍一覧
router.get("/rental/current/:uid", checkAdminPermission, async (req, res) => {
    const userId = parseInt(req.params.uid);

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const rentalBooks = await prisma.rental.findMany({
            where: { userId, returnDate: null },
            include: {
                Book: true
            }
        });

        const formattedRentalBooks = rentalBooks.map(rental => ({
            rentalId: rental.id,
            bookId: rental.Book.id,
            bookName: rental.Book.title,
            rentalDate: rental.rentalDate,
            returnDeadline: rental.returnDeadline
        }));

        res.status(200).json({
            userId,
            userName: user.name,
            rentalBooks: formattedRentalBooks
        });
    } catch (error) {
        errorHandler(res, 500, "Internal Server Error");
    }
});


export default router;