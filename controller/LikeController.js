const ensureAuthorization = require("../auth"); // 인증 모듈
const jwt =  require("jsonwebtoken");
const conn = require('../mariadb'); // db 모듈
const {StatusCodes} = require('http-status-codes'); // status code 모듈
const dotenv = require("dotenv");
dotenv.config();

const addLike = (req,res) => {
    // 좋아요 추가
    const book_id = req.params.id;
    let authorization = ensureAuthorization(req,res);
    
        if(authorization instanceof jwt.TokenExpiredError) {
            return res.status(StatusCodes.UNAUTHORIZED).json({
                "message" : "로그인 세션이 만료되었습니다. 다시 로그인 하세요."
            });
        } else if (authorization instanceof jwt.JsonWebTokenError){ 
            return res.status(StatusCodes.BAD_REQUEST).json({
                "message" : "잘못된 토큰입니다."
            });
        }else {
            let sql = `INSERT INTO likes (user_id, liked_book_id) VALUES(?,?);`;
            let values = [authorization.id, book_id];
            conn.query(sql,values, 
                (err, results) => {
                    if(err) {
                        console.log(err);
                        return res.status(StatusCodes.BAD_REQUEST).end(); // BAD REQUEST
                    }

                    res.status(StatusCodes.OK).json(results);
            })
        }
};

const removeLike = (req,res) => {
        const book_id = req.params.id;
        
        let authorization = ensureAuthorization(req,res);
        
            if(authorization instanceof jwt.TokenExpiredError) {
                return res.status(StatusCodes.UNAUTHORIZED).json({
                    "message" : "로그인 세션이 만료되었습니다. 다시 로그인 하세요."
                });
            } else if (authorization instanceof jwt.JsonWebTokenError){ 
                return res.status(StatusCodes.BAD_REQUEST).json({
                    "message" : "잘못된 토큰입니다."
                });
            }else {
                let sql = `DELETE FROM likes WHERE user_id = ? AND liked_book_id = ?;`;
                let values = [authorization, book_id];
                conn.query(sql,values, 
                    (err, results) => {
                        if(err) {
                            console.log(err);
                            return res.status(StatusCodes.BAD_REQUEST).end(); // BAD REQUEST
                        }

                        res.status(StatusCodes.OK).json(results);
                })
            }
}

module.exports = {addLike,removeLike};