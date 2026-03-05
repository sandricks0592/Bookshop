const ensureAuthorization = require("../auth"); // 인증 모듈
const jwt =  require("jsonwebtoken");
const conn = require('../mariadb'); // db 모듈
const {StatusCodes} = require('http-status-codes'); // status code 모듈
const { Result } = require("express-validator");

// 전체 도서 조회, 카테고리별 조회
const allBooks = (req, res) => {
    let allBooksRes = {};
    let { category_id, news, limit, currentPage } = req.query;

    let intLimit = parseInt(limit) || 4; 
    let intCurrentPage = parseInt(currentPage) || 1; 
    let offset = intLimit * (intCurrentPage - 1);

    // 1. 기본 조회 쿼리 구성
    let sql = "SELECT SQL_CALC_FOUND_ROWS *, (SELECT count(*) FROM likes WHERE liked_book_id = books.id) AS likes FROM books";
    let values = [];

    if (category_id && news) {
        sql += " WHERE category_id = ? AND pub_date BETWEEN DATE_SUB(NOW(), INTERVAL 1 MONTH) AND NOW()";
        values.push(category_id);
    } else if (category_id) {
        sql += " WHERE category_id = ?";
        values.push(category_id);
    } else if (news) {
        sql += " WHERE pub_date BETWEEN DATE_SUB(NOW(), INTERVAL 1 MONTH) AND NOW()";
    }

    // 2. 페이징 추가 (여기서 쿼리를 끝냅니다)
    sql += " LIMIT ? OFFSET ?";
    values.push(intLimit, offset);

    // 3. 첫 번째 쿼리(데이터 조회) 실행
    conn.query(sql, values, (err, results) => {
        if (err) {
            console.error("SQL 에러 (데이터 조회):", err.sqlMessage);
            return res.status(StatusCodes.BAD_REQUEST).end(); 
        }

        if (results && results.length > 0) {
            results.map(function(results){
                results.pubDate = results.pub_date;
            });
            allBooksRes.books = results;

            // 4. 첫 번째 쿼리가 성공한 후, 그 '안'에서 두 번째 쿼리(전체 개수) 실행
            // sql 변수를 재사용하지 않고 새 문자열을 씁니다.
            let countSql = "SELECT found_rows() AS total_count";
            
            conn.query(countSql, (err, countResults) => {
                if (err) {
                    console.error("SQL 에러 (개수 조회):", err.sqlMessage);
                    return res.status(StatusCodes.BAD_REQUEST).end(); 
                }
                    
                let pagination = {};
                pagination.currentPage = intCurrentPage;
                pagination.totalCount = countResults[0].total_count;

                allBooksRes.pagination = pagination;

                // 최종적으로 모든 데이터가 준비되었을 때 응답을 보냅니다.
                return res.status(StatusCodes.OK).json(allBooksRes);
            });
        } else {
            return res.status(StatusCodes.NOT_FOUND).end();
        } 
    });
};

// 개별 도서 조회
const bookDetail =  (req,res) =>{
    
    let authorization = ensureAuthorization(req,res);
    
        if(authorization instanceof jwt.TokenExpiredError) {
            return res.status(StatusCodes.UNAUTHORIZED).json({
                "message" : "로그인 세션이 만료되었습니다. 다시 로그인 하세요."
            });
        } else if (authorization instanceof jwt.JsonWebTokenError){ 
            return res.status(StatusCodes.BAD_REQUEST).json({
                "message" : "잘못된 토큰입니다."
            });
        }else if (authorization instanceof ReferenceError){
            
            let book_id = req.params.id;
            book_id = parseInt(book_id);

            let sql = `SELECT *,
                            (SELECT count(*) FROM likes WHERE liked_book_id = books.id) AS likes
                        FROM books
                        LEFT JOIN category 
                        ON books.category_id = category.category_id
                        WHERE books.id=?;`;
            let values = [authorization.id, book_id, book_id]
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

        }else {
            
            let book_id = req.params.id;
            book_id = parseInt(book_id);

            let sql = `SELECT *,
                            (SELECT count(*) FROM likes WHERE liked_book_id = books.id) AS likes,
                            (SELECT EXISTS (SELECT  * FROM likes WHERE user_id=? AND liked_book_id=?)) AS liked
                        FROM books
                        LEFT JOIN category 
                        ON books.category_id = category.category_id
                        WHERE books.id=?;`;
            let values = [authorization.id, book_id, book_id]
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
        }
};

module.exports = {
    allBooks,
    bookDetail
};