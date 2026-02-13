const conn = require('../mariadb'); // db 모듈
const {StatusCodes} = require('http-status-codes'); // status code 모듈

// 전체 도서 조회, 카테고리별 조회
const allCategory =  (req,res) =>{

        // 카테고리 전체 목록 리스트
        let sql = `SELECT * FROM category`;
        conn.query(sql,(err, results) => {
            if(err) {
                console.log(err);
                return res.status(StatusCodes.BAD_REQUEST).end(); // BAD REQUEST
            }

            res.status(StatusCodes.OK).json(results);
        })
}

module.exports = {allCategory};