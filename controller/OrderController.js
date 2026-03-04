const mariadb = require('mysql2/promise');
const { StatusCodes } = require('http-status-codes');

// DB 연결 설정 (매번 createConnection 하는 대신 Pool 사용 권장)
// 실제 서비스라면 별도 dbConfig 파일로 분리하는 것이 좋습니다.
const pool = mariadb.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: 'root',
    database: 'Bookshop',
    dateStrings: true,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const order = async (req, res) => {
    const conn = await pool.getConnection(); // Pool에서 연결 가져오기

    try {
        const { items, delivery, totalQuantity, totalPrice, userId, firstBookTitle } = req.body;

        // 1. [데이터 가공] 클라이언트가 보낸 items가 객체 배열이든 숫자 배열이든 ID 배열로 추출
        // 예: [{id:1}, {id:2}] -> [1, 2]
        const itemIds = items.map(item => typeof item === 'object' ? item.id : item);

        if (itemIds.length === 0) {
            return res.status(StatusCodes.BAD_REQUEST).json({ message: "주문할 항목이 없습니다." });
        }

        await conn.beginTransaction();

        // 2. delivery 테이블 삽입
        const deliverySql = `INSERT INTO delivery (address, receiver, contact) VALUES (?, ?, ?)`;
        const [deliveryResults] = await conn.execute(deliverySql, [delivery.address, delivery.receiver, delivery.contact]);
        const delivery_id = deliveryResults.insertId;

        // 3. orders 테이블 삽입
        const orderSql = `INSERT INTO orders (book_title, total_quantity, total_price, user_id, delivery_id)
                        VALUES (?, ?, ?, ?, ?)`;
        const [orderResults] = await conn.execute(orderSql, [firstBookTitle, totalQuantity, totalPrice, userId, delivery_id]);
        const order_id = orderResults.insertId;

        // 4. 장바구니에서 상세 정보 조회 (수정 포인트: itemIds 사용)
        const cartSql = `SELECT book_id, quantity FROM cartItems WHERE id IN (?)`;
        const [orderItems] = await conn.query(cartSql, [itemIds]);

        if (orderItems.length === 0) {
            throw new Error("장바구니에서 주문할 항목을 찾지 못했습니다. 보낸 ID를 확인하세요.");
        }

        // 5. orderedBook 테이블 삽입 (Bulk Insert)
        const orderedBookSql = `INSERT INTO orderedBook (order_id, book_id, quantity) VALUES ?`;
        const bulkValues = orderItems.map(item => [order_id, item.book_id, item.quantity]);
        
        // mysql2의 bulk insert는 [ [ [], [], [] ] ] 형태의 3중 배열 구조여야 함
        await conn.query(orderedBookSql, [bulkValues]);

        // 6. 장바구니 아이템 삭제
        await deleteCartItems(conn, itemIds);

        await conn.commit();
        return res.status(StatusCodes.OK).json({ orderId: order_id });

    } catch (err) {
        if (conn) await conn.rollback();
        console.error("Order Error:", err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "주문 처리 중 오류가 발생했습니다.",
            error: err.message
        });
    } finally {
        if (conn) conn.release(); // Pool에 연결 반환
    }
};

const deleteCartItems = async (conn, itemIds) => {
    const sql = `DELETE FROM cartItems WHERE id IN (?)`;
    const [results] = await conn.query(sql, [itemIds]);
    return results;
};

const getOrders = async (req, res) => {
    const conn = await pool.getConnection();
    
    sql = `SELECT orders.id, created_at,address,contact,receiver,
            book_title, total_quantity,total_price
            FROM orders LEFT JOIN delivery
            ON orders.delivery_id = delivery.id;`

    let [rows,fields] = await conn.query(sql);
    return res.status(StatusCodes.OK).json(rows);

};

const getOrderDetail = async (req, res) => {
    const {id} = req.params;

    const conn = await pool.getConnection();
    
    sql = `SELECT book_id, title, author, price, quantity
            FROM orderedBook LEFT JOIN books
            ON orderedBook.book_id = books.id
            WHERE order_id=?;`

    let [rows,fields] = await conn.query(sql,[id]);
    return res.status(StatusCodes.OK).json(rows);
};

module.exports = { order, getOrders, getOrderDetail };