import express from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = express.Router();

// 認証ミドルウェア
const authenticateUser = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    next();
};

// エラーハンドリングミドルウェア
const errorHandler = (res, statusCode, message) => {
    return res.status(statusCode).json({ error: message });
};

// 書籍一覧取得
router.get("/list", authenticateUser, async (req, res) => {
    try {
        const pageSize = 10; // ページあたりの書籍数
        const page = req.query.page ? parseInt(req.query.page) : 1;
        const skip = (page - 1) * pageSize;

        const [books, totalCount] = await Promise.all([
            prisma.books.findMany({
                take: pageSize,
                skip,
                orderBy: { id: "asc" },
                include: { Rental: true }
            }),
            prisma.books.count()
        ]);

        const maxPage = Math.ceil(totalCount / pageSize);

        const responseData = books.map(book => ({
            id: book.id,
            title: book.title,
            author: book.author,
            isRental: book.Rental.some(rental => !rental.returnDate || new Date(rental.returnDate) > new Date()), // 貸し出し中の場合は true を返す
            maxPage,
        }));

        res.status(200).json(responseData);
    } catch (error) {
        errorHandler(res, 500, error.message || "Internal Server Error");
    }
});

// 書籍詳細取得
router.get("/detail/:id", authenticateUser, async (req, res) => {
    try {
        const bookId = parseInt(req.params.id);

        const book = await prisma.books.findUnique({
            where: { id: bookId },
            include: { Rental: { include: { User: true } } }
        });

        if (!book) {
            return res.status(404).json({ error: "Book not found" });
        }

        const rentalInfo = book.Rental && book.Rental.length > 0 ? {
            userName: book.Rental[0].User.name,
            rentalDate: book.Rental[0].rentalDate,
            returnDeadline: book.Rental[0].returnDeadline
        } : null;

        const isRental = book.Rental.some(rental => !rental.returnDate || new Date(rental.returnDate) > new Date()); // 貸し出し中の場合は true を返す

        const responseData = {
            id: book.id,
            isbn13: book.isbn13,
            title: book.title,
            author: book.author,
            publishDate: book.publishDate,
            rentalInfo,
            isRental
        };

        res.status(200).json(responseData);
    } catch (error) {
        errorHandler(res, 500, error.message || "Internal Server Error");
    }
});


export default router;