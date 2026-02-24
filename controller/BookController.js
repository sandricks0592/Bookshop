const conn = require('../mariadb'); // db 모듈
const {StatusCodes} = require('http-status-codes'); // status code 모듈

// 전체 도서 조회, 카테고리별 조회
const allBooks = (req, res) => {
    let { category_id, news, limit, currentPage } = req.query;

    // 1. NaN 방지를 위한 기본값 설정 및 형변환 (매우 중요!)
    let intLimit = parseInt(limit) || 4; // limit이 없으면 기본 4개
    let intCurrentPage = parseInt(currentPage) || 1; // 페이지가 없으면 기본 1페이지
    let offset = intLimit * (intCurrentPage - 1);

    // 2. SQL문 조립 (기본 문구에서 중복된 FROM books 제거 및 세미콜론 삭제)
    let sql = "SELECT *, (SELECT count(*) FROM likes WHERE liked_book_id = books.id) AS likes FROM books";
    let values = [];

    // 3. WHERE 절 추가
    if (category_id && news) {
        sql += " WHERE category_id = ? AND pub_date BETWEEN DATE_SUB(NOW(), INTERVAL 1 MONTH) AND NOW()";
        values.push(category_id);
    } else if (category_id) {
        sql += " WHERE category_id = ?";
        values.push(category_id);
    } else if (news) {
        sql += " WHERE pub_date BETWEEN DATE_SUB(NOW(), INTERVAL 1 MONTH) AND NOW()";
    }

    // 4. LIMIT, OFFSET 추가 (values에 숫자가 들어가는지 꼭 확인)
    sql += " LIMIT ? OFFSET ?";
    values.push(intLimit, offset);

    conn.query(sql, values, (err, results) => {
        if (err) {
            console.error("SQL 에러 발생:", err.sqlMessage); // 에러 메시지를 더 구체적으로 확인
            return res.status(StatusCodes.BAD_REQUEST).end(); 
        }

        if (results && results.length) {
            return res.status(StatusCodes.OK).json(results);
        } else {
            return res.status(StatusCodes.NOT_FOUND).end();
        } 
    });
};

// 개별 도서 조회
const bookDetail =  (req,res) =>{
    let {user_id} = req.body;
    let book_id = req.params.id;
    book_id = parseInt(book_id);

    let sql = `SELECT *,
                    (SELECT count(*) FROM likes WHERE liked_book_id = books.id) AS likes,
                    (SELECT EXISTS (SELECT  * FROM likes WHERE user_id=? AND liked_book_id=?)) AS liked
                FROM books
                LEFT JOIN category 
                ON books.category_id = category.category_id
                WHERE books.id=?;`;
    let values = [user_id, book_id, book_id]
    conn.query(sql, values,
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