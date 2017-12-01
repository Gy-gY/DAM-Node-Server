# DAM应用的后端服务

## 主要负责:
### 对后端微服务接口的路由转发、包装、整理。使前端APP能访问一致的接口。
### 提供对前端APP的Session支持(如有需要)
### 提够前端APP需要的特殊接口（在后端微服务无法满足要求，且不适宜扩展的情况下）
### 用户访问接口的权限验证层

# 技术栈
## Nodejs Express (如果需要做缓存，连接redis)
　


# Swagger使用
## 通过编写　config/api/swagger.yaml 设计API
## 运行　scripts/gen-code-by-swagger-gen.sh (事先安装swagger-gen-client)
## 此时由swagger-gen-client生成 Nodejs的Mock服务端代码：　swagger-gen/mock-api-server
## 生成javascipt(es6)的client端代码: swagger-gen/typescipt-fetch, 通过编译Typescript生成es6代码