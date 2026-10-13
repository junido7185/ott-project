// 사용자 입력을 $regex에 넣기 전에 정규식 특수문자를 이스케이프
// (예: "(a+)+$" 같은 입력이 정규식으로 해석되어 에러/ReDoS가 나는 것을 방지)
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

module.exports = escapeRegex;
