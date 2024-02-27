import express from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = express.Router();

// 認証ミドルウェア
const authenticateUser = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    req.userId = req.user.id;
    next();
};

// エラーハンドリングミドルウェア
const errorHandler = (res, statusCode, message) => {
    return res.status(statusCode).json({ error: message });
};

// 書籍貸出開始
router.post("/start", authenticateUser, async (req, res) => {
    const { bookId } = req.body;
    const userId = req.userId;

    try {
        const existingRental = await prisma.rental.findFirst({
            where: { bookId, returnDate: null }
        });
        if (existingRental) {
            return errorHandler(res, 409, "Already rented");
        }

        const rental = await prisma.rental.create({
            data: { bookId, userId }
        });

        res.status(201).json(rental);
    } catch (error) {
        errorHandler(res, 400, error.message || "Bad Request");
    }
});

// 書籍返却
router.put("/return", authenticateUser, async (req, res) => {
    const { rentalId } = req.body;
    const userId = req.userId;

    try {
        const rental = await prisma.rental.findUnique({
            where: { id: parseInt(rentalId), userId: userId }
        });
        if (!rental) {
            return errorHandler(res, 400, "Rental not found");
        }

        await prisma.rental.update({
            where: { id: parseInt(rentalId) },
            data: { returnDate: new Date() } // 返却日を設定
        });

        res.status(200).json({ result: "OK" });
    } catch (error) {
        errorHandler(res, 400, error.message || "Bad Request");
    }
});

// 借用書籍一覧取得
router.get("/current", authenticateUser, async (req, res) => {
    const userId = req.userId;

    try {
        const rentalBooks = await prisma.rental.findMany({
            where: { userId },
            include: { Book: true }
        });
        res.status(200).json({ rentalBooks });
    } catch (error) {
        errorHandler(res, 500, error.message || "Internal Server Error");
    }
});

// 借用書籍履歴取得
router.get("/history", authenticateUser, async (req, res) => {
    const userId = req.userId;

    try {
        const rentalHistory = await prisma.rental.findMany({
            where: { userId, returnDate: { not: null } },
            include: { Book: true }
        });
        res.status(200).json({ rentalHistory });
    } catch (error) {
        errorHandler(res, 500, error.message || "Internal Server Error");
    }
});

export default router;