import mysql from "mysql2/promise";
import { NextResponse } from "next/server";

export const GET = async (_, { params }) => {
    const { scale } = params;

    const connection = await mysql.createConnection({
        host: process.env.HOST, // 資料庫主機
        user: process.env.USERNAME, // 資料庫使用者名稱
        password: process.env.PASSWORD, // 資料庫密碼
        database: process.env.DATABASE_HZ, // 資料庫名稱
    });

    try {
        // 查詢資料
        const [rows] = await connection.execute(
            `SELECT * FROM MergeDepth WHERE \`precision\` = ?`,
            [scale]
        );
        // 回傳資料
        return NextResponse.json(rows);
    } catch (error) {
        // 處理錯誤
        return NextResponse.json({ error: error.message }, { status: 500 });
    } finally {
        // 關閉連接
        await connection.end();
    }
};
