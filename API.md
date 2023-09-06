# API User's Guide

이 문서는 서버가 제공하는 엔드포인트에 대한 요청과 응답에 대한 속성들과 설명을 포함하고 있습니다.

## 1. Endpoint `/tx/record`
블록체인에 저장할 트랜잭션을 입력하는 엔드포인트입니다.

- ### Method : `POST`  

- ### Request
  - sequence : 트랜잭션의 순번
  - purchase_id : 구매 아이디
  - timestamp : 구매 일시 (UNIX EPOCH)
  - amount : 구매 금액 
  - franchisee_id: 가맹점 아이디
  - user_email : 사용자의 이메일 없을 때는 빈문자열
  - method	: 결제한 매체 (0: 현금또는 카드, 1: 마일리지, 2: 토큰)
  - signer : 서명자의 전송자 BOA 주소
  - signature : 전송자 서명  

- ### Response
  - `code` : 
    - 200 : 정상일 때 이 값을 리턴합니다. 트랜잭션을 성공적으로 접수했을 때 전달됩니다
    - 400 : 입력필드 오류
    - 417 : 잘못된 트랜잭션의 순번
    - 500 : 서비스 오류
  - `data` : code 의 값이 200 이면 "SUCCESS" 를 리턴합니다. 그렇지 않으면 이 속성은 존재하지 않습니다.
  - `error` : code 의 값이 200 이 아닐 때만 이 속성이 존재합니다. 
    - code 가 400 일 때 error 의 속성들
      - param : 오류가 발생한 입력필드
      - msg : 오류메세지
    - code 가 417 일 때 error 의 속성들
      - param: "sequence"
      - expected: 서버에서 수신되어야 할 예상 순번
      - actual: 클라이언트가 전송한 트랜잭션의 순번
      - msg: "sequence is different from the expected value"
    - code 가 500 일 때 error 의 속성들
      - msg : 오류 메세지

## 2. Endpoint `/tx/sequence`
가장 마지막에 수신한 트랜잭션의 순번을 제공하는 엔드포인트 입니다

- ### Method : `GET`

- ### Request

- ### Response
  - `code` :
    - 200 : 정상일 때 이 값을 리턴합니다. 트랜잭션을 성공적으로 접수했을 때 전달됩니다
    - 500 : 서비스 오류
  - `data` : code 의 값이 200일 때 data 의 속성들
    - sequence : 가장 마직막에 수신한 트랜잭션 순번
  - `error` : code 의 값이 200이 아닐 때만 이 속성이 존재합니다.
    - code 가 500 일 때  error 의 속성들
        - msg : 오류 메세지
