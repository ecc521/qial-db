read -p "This file is intended to set up a server to host the qial-db website. It may overwrite stuff without asking, although will attempt to avoid destroying existing config. Press enter to continue"

#Get updates
sudo apt-get update
sudo apt-get upgrade

#Install git
sudo apt-get install -y git

#Install ZIP
sudo apt-get install -y zip

sudo apt-get install python3 python3-pip
pip3 install nibabel numpy argparse pathlib imageio

#For infoGen.py
pip3 install pandas neuroglancer-scripts xlrd==1.2.0 #Any v1 of xlrd.


#Clone qial-db
cd $HOME
git clone https://github.com/ecc521/qial-db.git
git submodule update --init --recursive
pushd neuroglancer
npm install
popd

#Install NodeJS
curl -sL https://deb.nodesource.com/setup_14.x | sudo bash -
sudo apt-get install -y nodejs

#Build qial-db
cd qial-db
npm install

#Install apache
sudo apt-get install -y apache2

#Enable needed modules
sudo a2enmod rewrite
sudo a2enmod headers
sudo a2enmod proxy #This is needed for the NodeJS server portion, but not the rest of the site. Enable it now anyways.
sudo a2enmod proxy_http
sudo a2enmod http2

sudo rm /etc/apache2/sites-available/qial-db.conf

sudo tee -a /etc/apache2/sites-available/qial-db.conf > /dev/null << EOF
<VirtualHost *:80>
		ServerAdmin admin@rivers.run.com
		ServerName qial-db.rivers.run
		ServerAlias www.qial-db.rivers.run
		DocumentRoot $HOME/qial-db
		ErrorLog ${APACHE_LOG_DIR}/error.log
		CustomLog ${APACHE_LOG_DIR}/access.log combined
</VirtualHost>

LoadModule proxy_module modules/mod_proxy.so
LoadModule proxy_http_module modules/mod_proxy_http.so
LoadModule http2_module modules/mod_http2.so

ProxyPass / http://127.0.0.1:8000/
Protocols h2 http/1.1

AddOutputFilterByType DEFLATE application/json

<Directory $HOME/qial-db/>
    	Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
</Directory>
EOF

sudo a2ensite qial-db

sudo rm /etc/apache2/conf-available/NODEQIALDB.conf
sudo tee -a /etc/apache2/conf-available/NODEQIALDB.conf > /dev/null << EOF
<Directory $HOME/qial-db/>
    	Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
</Directory>
EOF

sudo a2enconf NODEQIALDB #To disable, run sudo a2disconf NODEQIALDB

#Restart apache so configuration changes take effect.
sudo systemctl restart apache2

#Install Certbot
sudo apt-get install -y certbot python-certbot-apache
sudo certbot --apache --hsts

echo "Swap file recommended, assuming maximum server memory is low: "
echo "Google Cloud Compute Engine: https://badlywired.com/2016/08/15/adding-swap-google-compute-engine/"

echo "Adding instructions to crontab. The server is currently scheduled to reboot periodically, which you may want to disable. "

#Run server on reboot. Reboot at 4am every day. Run certbot renew on each reboot.
(crontab -l ; echo "@reboot mkdir -p ${HOME}/qial-db/server/logs/ && node $HOME/qial-db/server.js >> $HOME/qial-db/server/logs/main.log") | sort - | uniq - | crontab -
(crontab -l ; echo "@reboot sudo certbot renew") | sort - | uniq - | crontab -
(crontab -l ; echo "0 4   *   *   *    sudo reboot") | sort - | uniq - | crontab -

echo "Rebooting now is recommended, and should start the site up properly. "
