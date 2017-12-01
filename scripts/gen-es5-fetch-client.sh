#!/bin/bash
echo "Make Sure swagger-gen tool installed first."
swagger_gen_path=${swagger_gen_path}
echo "swagger_gen_path: ${swagger_gen_path}"
echo "Generate Api client es5 code to Folder ../swagger-gen/javascript-es5-fetch"

java -jar ${swagger_gen_path} generate -l typescript-fetch -i ../config/damApi.yaml -o ../swagger-gen/javascript-es5-fetch
cd ../swagger-gen/javascript-es5-fetch && npm run prepublish && \
mv dist/api.d.ts dist/nodeApi.d.ts && mv dist/api.js dist/nodeApi.js
cd -

java -jar ${swagger_gen_path} generate -l typescript-fetch -i ../config/passport.json -o ../swagger-gen/javascript-es5-fetch
cd ../swagger-gen/javascript-es5-fetch && npm run prepublish && \
mv dist/api.d.ts dist/passportApi.d.ts && mv dist/api.js dist/passportApi.js
cd -

java -jar ${swagger_gen_path} generate -l typescript-fetch -i ../config/resource.json -o ../swagger-gen/javascript-es5-fetch
cd ../swagger-gen/javascript-es5-fetch && npm run prepublish && \
mv dist/api.d.ts dist/resourceApi.d.ts && mv dist/api.js dist/resourceApi.js
cd -