const conn = require('../mariadb'); // db 모듈
const {StatusCodes} = require('http-status-codes'); // status code 모듈

// 전체 도서 조회, 카테고리별 조회
const allBooks = (req, res) => {
    let { category_id, news, limit, currentPage } = req.query;

    // 1. 숫자 형변환 및 offset 계산
    let intLimit = parseInt(limit);
    let intCurrentPage = parseInt(currentPage);
    let offset = intLimit * (intCurrentPage - 1);

    // 2. SQL문 조립 (기본 문구 작성)
    let sql = "SELECT * FROM books";
    let values = [];

    // 3. WHERE 절 추가 (중간에 배치)
    if (category_id && news) {
        sql += " WHERE category_id = ? AND pub_date BETWEEN DATE_SUB(NOW(), INTERVAL 1 MONTH) AND NOW()";
        values.push(category_id);
    } else if (category_id) {
        sql += " WHERE category_id = ?";
        values.push(category_id);
    } else if (news) {
        sql += " WHERE pub_date BETWEEN DATE_SUB(NOW(), INTERVAL 1 MONTH) AND NOW()";
    }

    // 4. LIMIT, OFFSET은 반드시 맨 마지막에 추가!
    sql += " LIMIT ? OFFSET ?";
    values.push(intLimit, offset);

    // DB 쿼리 실행
    conn.query(sql, values, (err, results) => {
        if (err) {
            console.log(err);
            return res.status(StatusCodes.BAD_REQUEST).end(); 
        }

        if (results.length) {
            return res.status(StatusCodes.OK).json(results);
        } else {
            return res.status(StatusCodes.NOT_FOUND).end();
        } 
    });
};

// 개별 도서 조회
const bookDetail =  (req,res) =>{
    let {id} = (req.params);
    id = parseInt(id);

    let sql = `SELECT * FROM books LEFT JOIN category 
                ON books.category_id = category.id WHERE books.id= ?`;
    conn.query(sql,id,
        (err, results) => {
            if(err) {
                console.log(err);
                return res.status(StatusCodes.BAD_REQUEST).end(); // BAD REQUEST
            }
            if(results[0])
                return res.status(StatusCodes.OK).json(results[0]);
            else
                return res.status(StatusCodes.NOT_FOUND).end();
        })
};

module.exports = {
    allBooks,
    bookDetail
};