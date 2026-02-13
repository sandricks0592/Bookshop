const conn = require('../mariadb'); // db 모듈
const {StatusCodes} = require('http-status-codes'); // status code 모듈

// 전체 도서 조회, 카테고리별 조회
const allBooks =  (req,res) =>{
    let {category_id} = req.query;

    if(category_id) {
        let sql = 'SELECT * FROM books WHERE category_id = ?';
        conn.query(sql, category_id,
            (err, results) => {
                if(err) {
                    console.log(err);
                    return res.status(StatusCodes.BAD_REQUEST).end(); // BAD REQUEST
                }

                if (results.length) {
                    return res.status(StatusCodes.OK).json(results);
                } else {
                    return res.status(StatusCodes.UNAUTHORIZED).end();
                } 
            }
        )
    } else{
        let sql = `SELECT * FROM books`;
        conn.query(sql,(err, results) => {
            if(err) {
                console.log(err);
                return res.status(StatusCodes.BAD_REQUEST).end(); // BAD REQUEST
            }

            res.status(StatusCodes.OK).json(results);
        })
    }

    
    
};

// 개별 도서 조회
const bookDetail =  (req,res) =>{
    let {id} = (req.params);
    id = parseInt(id);

    let sql = `SELECT * FROM books WHERE id=?`;
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