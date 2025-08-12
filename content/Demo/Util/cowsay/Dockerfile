FROM ubuntu:22.04
RUN apt-get update && apt-get install -y cowsay
COPY whale.cow /usr/share/cowsay/cows/
ENTRYPOINT ["cowsay", "-f", "whale"]