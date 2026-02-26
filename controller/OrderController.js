const conn = require('../mariadb'); // db 모듈
const {StatusCodes} = require('http-status-codes'); // status code 모듈

const order = (req, res) => {
    // 0. items를 구조 분해 할당에 추가해야 합니다.
    const { items, delivery, totalQuantity, totalPrice, userId, firstBookTitle } = req.body;

    // 1. 배송 정보 저장
    let sql = `INSERT INTO delivery (address, receiver, contact) VALUES (?, ?, ?)`;
    let values = [delivery.address, delivery.receiver, delivery.contact];

    conn.query(sql, values, (err, results) => {
        if (err) {
            console.log(err);
            return res.status(StatusCodes.BAD_REQUEST).end();
        }

        const delivery_id = results.insertId;

        // 2. 주문 정보 저장 (배송 저장 성공 후 실행)
        sql = `INSERT INTO orders (book_title, total_quantity, total_price, user_id, delivery_id)
                VALUES (?, ?, ?, ?, ?)`;
        values = [firstBookTitle, totalQuantity, totalPrice, userId, delivery_id];

        conn.query(sql, values, (err, orderResults) => {
            if (err) {
                console.log(err);
                return res.status(StatusCodes.BAD_REQUEST).end();
            }

            const order_id = orderResults.insertId; // 여기서 생성된 order_id를 사용

            // 3. 주문 상세 정보 저장 (주문 저장 성공 후 실행)
            // [중요] 반드시 이 콜백 안에서 bulkValues를 만들어야 order_id를 인식합니다.
            const bulkValues = [];
            items.forEach((item) => {
                bulkValues.push([order_id, item.book_id, item.quantity]);
            });

            sql = `INSERT INTO orderedBook (order_id, book_id, quantity) VALUES ?`;
            conn.query(sql, [bulkValues], (err, results) => {
                if (err) {
                    console.log(err);
                    return res.status(StatusCodes.BAD_REQUEST).end();
                }

                // 모든 과정이 성공했을 때 딱 한 번만 최종 응답
                return res.status(StatusCodes.CREATED).json({
                    message: "주문이 모두 완료되었습니다.",
                    orderId: order_id
                });
            });
        });
    });
};

const getOrders = (req,res) =>{
    res.json('주문 목록 조회');
}

const getOrderDetail = (req,res) =>{
    res.json('주문 상세 상품 조회');
}





module.exports = {order,getOrders,getOrderDetail};