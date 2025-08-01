1. Query Understanding - Given a query this step needs to infer the 
intention of the query.
 E.g. ‘sneakers for men’ => category = shoes, type = sneakers, 
ideal-for = man, etc.
 ‘rakhi for bhai’ => category=rakhi-merchandise, etc.
 [The above examples are purely for representation and actual solutions infer a lot 
more about the query than here.]
 2. Product Retrieval - Having understood the intention behind the 
query, this step is responsible for getting all products that match 
the query intent from the product index. 
In a naive setup, assume that the product index has all the 
product attributes available on which querying can happen to 
match with the user’s query. It could very well be not a direct 
match and an embedding vectors based search.
 E.g. Query = ‘sneakers for men’. We may match with a few million 
of such products given that flipkart has hundreds of millions of 
products listed.
Steps
 3. Ranking of products - Having retrieved the matched products, this 
step ensures putting the most relevant and one with the highest 
probability of getting a user click at the top.
 4. Presentation layer - This step is responsible to blend the product 
results with filters, ads, banners, etc and create a page that is 
presented to the user. It controls styling and design of cards, the 
most appropriate layout to be chosen (list vs grid) for different 
SRPs, etc