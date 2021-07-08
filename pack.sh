#!/bin/bash
cmd_path=$(dirname $0)
cd $cmd_path

echo "start create venv"
mkdir ./venvs
cd ./venvs
python3 -m venv --copies ./venv
. ./venv/bin/activate
cd ..
# python -m pip install --index-url http://mirrors.aliyun.com/pypi/simple/ --trusted-host mirrors.aliyun.com -r ./requirements.txt
# python -m pip install --index-url https://pypi.tuna.tsinghua.edu.cn/simple/  --trusted-host pypi.tuna.tsinghua.edu.cn -r ./requirements.txt
python -m pip install ./litedfs_client-0.0.8-py3-none-any.whl
python -m pip install -r ./requirements.txt
cd ./venvs
python -m venv_pack
deactivate
rm -rf ./venv
echo "end create venv"

echo "start pack application"
cd ../..
if [ "$target" == "tar.gz" ]
then
    echo "pack tar.gz package"
    tar cvzf ./image_annotation_service.tar.gz image_annotation_service
else
    echo "pack zip package"
    zip -r ./image_annotation_service.zip image_annotation_service
fi;
echo "end pack application"
